'use client'

// Lightweight mesh WebRTC engine shared by Discussion Rooms (audio) and
// Virtual Libraries (video). Uses deterministic initiator (smaller userId
// sends the offer) to avoid glare, and STUN-only for candidates.

const STUN = 'stun:stun.l.google.com:19302'

export interface RoomMember {
  userId: string
  displayName: string
  color: string
  gender?: string
  role?: string
  onStage: boolean
  onStageSince?: number | null
}

export interface RoomCallOptions {
  userId: string
  roomId: string
  kind: 'audio' | 'video'
  enabled: boolean
  getMyIsSpeaker: () => boolean
  getPeerIsSpeaker: (m: RoomMember) => boolean
  sendSignal: (to: string | null, data: any) => void
  onStreamAdded: (userId: string, stream: MediaStream) => void
  onStreamRemoved: (userId: string) => void
  onLocalMedia: (stream: MediaStream | null) => void
  onPeerOpen?: (userId: string, pc: RTCPeerConnection) => void
}

export class RoomCall {
  private opts: RoomCallOptions
  private pcs = new Map<string, RTCPeerConnection>()
  private remotes = new Map<string, MediaStream>()
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>()
  private local: MediaStream | null = null
  private speaker = false
  private livePeers = new Map<string, RoomMember>()
  private starting = false
  private disposed = false
  private reconcileTimer: ReturnType<typeof setInterval> | null = null

  constructor(opts: RoomCallOptions) {
    this.opts = opts
    this.speaker = opts.getMyIsSpeaker()
  }

  async start() {
    this.startReconcile()
  }

  async ensureMedia() {
    if (this.local || this.disposed) return this.local
    if (!navigator.mediaDevices?.getUserMedia) return null
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.opts.kind === 'video' ? { width: 320, height: 240, facingMode: 'user' } : false,
      })
      this.opts.onLocalMedia?.(this.local)
    } catch {
      this.opts.onLocalMedia?.(null)
    }
    return this.local
  }

  setSpeaker(isSpeaker: boolean) {
    if (this.speaker === isSpeaker) return
    this.speaker = isSpeaker
    this.reconcile()
  }

  private pcConfig() {
    return { iceServers: [{ urls: STUN }] }
  }

  private createPc(targetId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.pcConfig())
    this.pcs.set(targetId, pc)

    const sync = () => this.syncLocalTrack(pc)

    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignal(targetId, { type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.onnegotiationneeded = () => {
      if (pc.signalingState === 'stable' && this.opts.userId < targetId) {
        sync()
        this.makeOffer(targetId)
      }
    }
    pc.ontrack = (e) => {
      const stream = e.streams?.[0] || new MediaStream([e.track])
      this.remotes.set(targetId, stream)
      if (this.pendingCandidates.get(targetId)?.length) {
        this.flushCandidates(targetId)
      }
      this.opts.onStreamAdded(targetId, stream)
    }
    this.opts.onPeerOpen?.(targetId, pc)
    return pc
  }

  private ensurePc(targetId: string): RTCPeerConnection {
    return this.pcs.get(targetId) || this.createPc(targetId)
  }

  private syncLocalTrack(pc: RTCPeerConnection) {
    if (!this.local) return
    const senders = pc.getSenders()
    const kinds = this.opts.kind === 'video' ? ['audio', 'video'] : ['audio']
    if (this.speaker) {
      for (const kind of kinds) {
        if (!senders.some(s => s.track?.kind === kind)) {
          const track = this.local!.getTracks().find(t => t.kind === kind)
          if (track) {
            try { pc.addTrack(track, this.local!) } catch { /* ignore */ }
          }
        }
      }
    } else {
      for (const s of senders) {
        if (s.track && kinds.includes(s.track.kind)) {
          try { pc.removeTrack(s) } catch { /* ignore */ }
        }
      }
    }
  }

  private makeOffer(targetId: string) {
    const pc = this.pcs.get(targetId)
    if (!pc) return
    if (pc.signalingState !== 'stable') return
    this.syncLocalTrack(pc)
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => this.sendSignal(targetId, { type: 'offer', sdp: pc.localDescription }))
      .catch(() => { /* ignore */ })
  }

  onSignal(from: string, to: string | null, data: any) {
    if (this.disposed) return
    const me = this.opts.userId
    if (to && to !== me) return
    if (!this.livePeers.has(from)) return

    const pc = this.ensurePc(from)
    const d = data || {}

    if (d.type === 'offer') {
      if (pc.signalingState !== 'stable' && this.opts.userId !== from) return
      // Deterministic initiator: whoever had an in-flight offer and is NOT the
      // smaller id is the impolite one — rollback its local offer.
      if (pc.signalingState === 'have-local-offer' && this.opts.userId < from) {
        try { pc.setLocalDescription({ type: 'rollback' as RTCSessionDescriptionInit['type'] }) } catch { /* ignore */ }
        pc.remoteDescription = null
      }
      pc.setRemoteDescription(new RTCSessionDescription(d))
        .then(() => this.flushCandidates(from))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() => {
          if (pc.localDescription) this.sendSignal(from, { type: 'answer', sdp: pc.localDescription })
        })
        .catch(() => { /* ignore */ })
    } else if (d.type === 'answer') {
      if (pc.signalingState === 'have-local-offer') {
        pc.setRemoteDescription(new RTCSessionDescription(d)).then(() => this.flushCandidates(from)).catch(() => { /* ignore */ })
      }
    } else if (d.type === 'ice') {
      if (pc.remoteDescription) {
        pc.addIceCandidate(d.candidate).catch(() => { /* ignore */ })
      } else {
        const list = this.pendingCandidates.get(from) || []
        list.push(d.candidate as RTCIceCandidateInit)
        this.pendingCandidates.set(from, list)
      }
    }
  }

  private flushCandidates(targetId: string) {
    const list = this.pendingCandidates.get(targetId) || []
    this.pendingCandidates.delete(targetId)
    const pc = this.pcs.get(targetId)
    if (pc) {
      for (const c of list) pc.addIceCandidate(c).catch(() => { /* ignore */ })
    }
  }

  private sendSignal(to: string, data: any) {
    this.opts.sendSignal(to, data)
  }

  setPresence(members: RoomMember[]) {
    const speakers = new Map<string, RoomMember>()
    for (const m of members) {
      if (m.userId === this.opts.userId) continue
      if (this.opts.getPeerIsSpeaker(m)) speakers.set(m.userId, m)
    }
    this.livePeers = speakers

    // Close connections to peers no longer on stage / no longer present
    const wanted = new Set(speakers.keys())
    for (const [id, pc] of this.pcs) {
      if (!wanted.has(id)) {
        try { pc.close() } catch { /* ignore */ }
        this.pcs.delete(id)
        const old = this.remotes.get(id)
        if (old) { this.remotes.delete(id); this.opts.onStreamRemoved(id) }
        this.pendingCandidates.delete(id)
      }
    }

    // Open new connections & offer from initiator side
    for (const [id, m] of speakers) {
      if (this.pcs.has(id)) {
        // Ensure correct negotiation state for an existing pc
        continue
      }
      const pc = this.createPc(id)
      this.syncLocalTrack(pc)
      if (this.opts.userId < id) {
        this.makeOffer(id)
      }
    }
  }

  private startReconcile() {
    this.reconcileTimer = setInterval(() => this.reconcile(), 3000)
  }

  private reconcile() {
    if (this.disposed) return
    if (this.opts.getMyIsSpeaker()) {
      this.ensureMedia()
    }
    // Re-add/remove local track if media became available
    for (const [id] of this.pcs) {
      this.syncLocalTrack(this.pcs.get(id)!)
    }
  }

  dispose() {
    this.disposed = true
    if (this.reconcileTimer) clearInterval(this.reconcileTimer)
    for (const pc of this.pcs.values()) {
      try { pc.close() } catch { /* ignore */ }
    }
    this.pcs.clear()
    this.remotes.clear()
    this.pendingCandidates.clear()
    this.local?.getTracks().forEach(t => t.stop())
    this.local = null
  }
}