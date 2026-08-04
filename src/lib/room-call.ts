'use client'

// Lightweight mesh WebRTC engine shared by Discussion Rooms (audio) and
// Virtual Libraries (video). Signalling is relayed through a shared DB polling
// channel so it works across serverless instances. Glare is resolved by
// "perfect negotiation": when both sides currently hold a local offer, the
// smaller userId yields (rollback) and accepts the peer's offer.

const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
]

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
  private lastOfferAt = new Map<string, number>()
  private disposed = false
  private reconcileTimer: ReturnType<typeof setInterval> | null = null

  constructor(opts: RoomCallOptions) {
    this.opts = opts
    this.speaker = opts.getMyIsSpeaker()
  }

  start() {
    this.startReconcile()
  }

  async ensureMedia() {
    if (this.local || this.disposed) return this.local
    if (!navigator.mediaDevices?.getUserMedia) return null
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.opts.kind === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
      })
      this.opts.onLocalMedia?.(this.local)
      this.syncAllLocalTracks()
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

  private isInitiator(targetId: string): boolean {
    return this.opts.userId < targetId
  }

  private pcConfig() {
    return { iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 }
  }

  private createPc(targetId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.pcConfig())
    this.pcs.set(targetId, pc)

    const sync = () => this.syncLocalTrack(pc)

    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignal(targetId, { type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.onnegotiationneeded = () => {
      if (pc.signalingState === 'stable') {
        sync()
        this.makeOffer(targetId)
      }
    }
    pc.ontrack = (e) => {
      const stream = e.streams?.[0] || new MediaStream([e.track])
      this.remotes.set(targetId, stream)
      if (this.pendingCandidates.get(targetId)?.length) this.flushCandidates(targetId)
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
          if (track) { try { pc.addTrack(track, this.local!) } catch { /* ignore */ } }
        }
      }
    } else {
      for (const s of senders) {
        if (s.track && kinds.includes(s.track.kind)) { try { pc.removeTrack(s) } catch { /* ignore */ } }
      }
    }
  }

  private syncAllLocalTracks() {
    for (const pc of this.pcs.values()) this.syncLocalTrack(pc)
  }

  private makeOffer(targetId: string) {
    const pc = this.pcs.get(targetId)
    if (!pc) return
    if (pc.signalingState !== 'stable') return
    if (!this.local) return
    this.syncLocalTrack(pc)
    this.lastOfferAt.set(targetId, Date.now())
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => { if (pc.localDescription) this.sendSignal(targetId, { type: 'offer', sdp: pc.localDescription }) })
      .catch(() => { /* ignore */ })
  }

  onSignal(from: string, to: string | null, data: any) {
    if (this.disposed) return
    const me = this.opts.userId
    if (to && to !== me) return
    const d = data || {}

    // Keep a connection for anyone who talks to us, even if we haven't yet
    // received the room state that lists them.
    const pc = this.ensurePc(from)

    if (d.type === 'offer') {
      if (pc.signalingState === 'have-local-offer') {
        if (this.isInitiator(from)) {
          // I'm polite (smaller id): yield my in-flight offer and accept theirs.
          try { pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit) } catch { /* ignore */ }
        } else {
          // I'm impolite (larger id): the polite peer will rollback instead.
          return
        }
      }
      if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
        pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: d.sdp }))
          .then(() => this.flushCandidates(from))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() => { if (pc.localDescription) this.sendSignal(from, { type: 'answer', sdp: pc.localDescription }) })
          .catch(() => { /* ignore */ })
      } else {
        // Store the offer until we're ready to answer.
        this.pendingOffer = { from, sdp: d.sdp }
      }
    } else if (d.type === 'answer') {
      if (pc.signalingState === 'have-local-offer') {
        pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: d.sdp }))
          .then(() => this.flushCandidates(from))
          .then(() => this.syncLocalTrack(pc))
          .catch(() => { /* ignore */ })
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

  private pendingOffer: { from: string; sdp: any } | null = null

  private flushCandidates(targetId: string) {
    const list = this.pendingCandidates.get(targetId) || []
    this.pendingCandidates.delete(targetId)
    const pc = this.pcs.get(targetId)
    if (pc) for (const c of list) pc.addIceCandidate(c).catch(() => { /* ignore */ })
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

    this.reconcile()
  }

  private startReconcile() {
    this.reconcileTimer = setInterval(() => this.reconcile(), 2500)
  }

  private reconcile() {
    if (this.disposed) return
    if (this.speaker) this.ensureMedia()

    const now = Date.now()
    for (const [id] of this.livePeers) {
      if (!this.pcs.has(id)) {
        this.createPc(id)
        this.syncLocalTrack(this.pcs.get(id)!)
        if (this.isInitiator(id)) this.makeOffer(id)
      } else if (this.isInitiator(id)) {
        const pc = this.pcs.get(id)!
        const state = pc.iceConnectionState
        const notEstablished = state !== 'connected' && state !== 'completed'
        if (pc.signalingState === 'stable' && notEstablished && (now - (this.lastOfferAt.get(id) || 0)) >= 4000) {
          this.makeOffer(id)
        }
      } else {
        this.syncLocalTrack(this.pcs.get(id)!)
      }
      this.syncAllLocalTracks()
    }

    // Deliver a stored offer if we are ready now.
    if (this.pendingOffer) {
      const pf = this.pendingOffer
      this.pendingOffer = null
      this.onSignal(pf.from, this.opts.userId, { type: 'offer', sdp: pf.sdp })
    }
  }

  dispose() {
    this.disposed = true
    if (this.reconcileTimer) clearInterval(this.reconcileTimer)
    for (const pc of this.pcs.values()) { try { pc.close() } catch { /* ignore */ } }
    this.pcs.clear()
    this.remotes.clear()
    this.pendingCandidates.clear()
    this.local?.getTracks().forEach(t => t.stop())
    this.local = null
  }
}