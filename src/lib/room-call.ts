'use client'

// Lightweight mesh WebRTC engine shared by Discussion Rooms (audio) and
// Virtual Libraries (video). Signalling is relayed through a shared DB polling
// channel so it works across serverless instances. Glare is resolved by
// "perfect negotiation": when both sides currently hold a local offer, the
// smaller userId yields (rollback) and accepts the peer's offer.

const TURN_USERNAME = '000000002101377832'
const TURN_PASSWORD = 'LontLkAukn0glzMGPwfSwSPPrs3='

const ICE_SERVERS = [
  { urls: ['stun:free.expressturn.com:3478'], username: TURN_USERNAME, credential: TURN_PASSWORD },
  { urls: ['turn:free.expressturn.com:3478?transport=udp'], username: TURN_USERNAME, credential: TURN_PASSWORD },
  { urls: ['turns:free.expressturn.com:443'], username: TURN_USERNAME, credential: TURN_PASSWORD },
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
]

// Video quality ladder for the Virtual Library. Non-speakers are forced to the
// lowest rung (144p); a gradient-descent-style controller climbs a speaking
// user toward the best rung the network can sustain (up to 480p), backing off
// one step whenever packet loss or latency rises — converging to an equilibrium
// near the available capacity. `scale` is applied relative to the captured
// source (~720p) via RTCRtpSender.setParameters()'s scaleResolutionDownBy;
// `maxBitrate` caps the encoder in bits per second.
const VIDEO_QUALITY_LEVELS = [
  { label: '144p', scale: 5, maxBitrate: 90_000 },
  { label: '240p', scale: 3, maxBitrate: 200_000 },
  { label: '360p', scale: 2, maxBitrate: 450_000 },
  { label: '480p', scale: 1.5, maxBitrate: 800_000 },
]

export interface RoomMember {
  userId: string
  displayName: string
  color: string
  gender?: string
  role?: string
  onStage: boolean
  stageRequested?: boolean
  stageInvited?: boolean
  onStageSince?: number | null
  micOff?: boolean
  speaking?: boolean
  stageApproveVotes?: string[]
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
  onQualityChange?: (label: string) => void
}

export class RoomCall {
  private opts: RoomCallOptions
  private pcs = new Map<string, RTCPeerConnection>()
  private remotes = new Map<string, MediaStream>()
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>()
  private local: MediaStream | null = null
  private speaker = false
  private speaking = false
  private micEnabled = true
  private camEnabled = true
  private livePeers = new Map<string, RoomMember>()
  private lastOfferAt = new Map<string, number>()
  private disposed = false
  private reconcileTimer: ReturnType<typeof setInterval> | null = null
  private seenSignalIds = new Set<string>()
  private qualityTimer: ReturnType<typeof setInterval> | null = null
  private qualityApplied = false
  private lastQualityLabel: string | null = null
  // When the user stops speaking, hold the highest quality level reached for
  // this long before falling back to the lowest rung (144p).
  private silentSince: number | null = null
  private quality: { level: number; goodTicks: number; lossEwma: number; rttEwma: number; last: { lost: number; received: number } | null } | null = null

  constructor(opts: RoomCallOptions) {
    this.opts = opts
    this.speaker = opts.getMyIsSpeaker()
    try { (window as any).__roomCall = this } catch { /* ignore */ }
  }

  private log(...args: any[]) {
    console.log(`[RoomCall:${this.opts.kind}]`, ...args)
  }

  start() {
    this.log('start', { userId: this.opts.userId, roomId: this.opts.roomId, speaker: this.speaker })
    // Acquire media immediately if we're already on stage so the first offer
    // carries our tracks instead of waiting up to a reconcile tick.
    if (this.speaker) this.ensureMedia()
    this.startReconcile()
  }

  async ensureMedia() {
    if (this.local || this.disposed) return this.local
    if (!navigator.mediaDevices?.getUserMedia) return null
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: true,
        // Capture ~720p so the quality ladder can downscale to 240p default and
        // climb back up to 720p without restarting the camera.
        video: this.opts.kind === 'video' ? { width: { ideal: 1280, height: 720 }, facingMode: 'user' } : false,
      })
      this.log('local media ok', { tracks: this.local.getTracks().map(t => t.kind) })
      for (const t of this.local.getAudioTracks()) t.enabled = this.micEnabled
      for (const t of this.local.getVideoTracks()) t.enabled = this.camEnabled
      this.opts.onLocalMedia?.(this.local)
      this.syncAllLocalTracks()
    } catch (err) {
      this.log('local media FAILED', err)
      this.opts.onLocalMedia?.(null)
    }
    return this.local
  }

  setSpeaker(isSpeaker: boolean) {
    if (this.speaker === isSpeaker) return
    this.speaker = isSpeaker
    if (!isSpeaker) this.speaking = false
    if (isSpeaker) this.ensureMedia()
    this.reconcile()
  }

  // Local speech state drives video quality: silent participants send at 144p,
  // a speaking participant climbs toward the best level the network sustains.
  setSpeaking(isSpeaking: boolean) {
    if (this.speaking === isSpeaking) return
    this.speaking = isSpeaking
    this.log('speaking', isSpeaking)
    if (this.opts.kind === 'video') this.runQualityAdaptation()
  }

  setMicEnabled(enabled: boolean) {
    if (this.micEnabled === enabled) return
    this.micEnabled = enabled
    this.log('mic', enabled ? 'on' : 'off')
    if (this.local) {
      const track = this.local.getAudioTracks()[0]
      if (track) track.enabled = enabled
    }
    // Detach/attach the track on every peer so the mute is truly "blocked",
    // not just local silence/black.
    this.syncAllLocalTracks()
  }

  setCamEnabled(enabled: boolean) {
    if (this.camEnabled === enabled) return
    this.camEnabled = enabled
    this.log('cam', enabled ? 'on' : 'off')
    if (this.local) {
      const track = this.local.getVideoTracks()[0]
      if (track) track.enabled = enabled
    }
    this.syncAllLocalTracks()
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
    this.log('pc created', targetId, this.isInitiator(targetId) ? 'initiator' : 'polite')

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
    pc.onconnectionstatechange = () => {
      this.log('conn', targetId, pc.connectionState)
    }
    pc.oniceconnectionstatechange = () => {
      this.log('ice', targetId, pc.iceConnectionState)
    }
    pc.ontrack = (e) => {
      // A muted peer detaching their sender fires ontrack with track == null;
      // keep the existing stream (its analyser already goes silent) instead of
      // replacing it with an empty one that would never re-meter audio.
      if (!e.track) return
      this.log('remote track', targetId, e.track.kind)
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
    const kinds = this.opts.kind === 'video' ? ['audio', 'video'] : ['audio']
    if (this.speaker) {
      for (const kind of kinds) {
        const muted = (kind === 'audio' && !this.micEnabled) || (kind === 'video' && !this.camEnabled)
        const track = this.local.getTracks().find(t => t.kind === kind)
        if (muted || !track) {
          // True mute: detach any sender carrying this kind so the media is
          // fully blocked from the wire (not just enabled=false).
          for (const s of pc.getSenders()) {
            if (s.track?.kind === kind) { try { pc.removeTrack(s) } catch { /* ignore */ } }
          }
          continue
        }
        if (pc.getSenders().some(s => s.track === track)) continue
        try { pc.addTrack(track, this.local) } catch { /* ignore */ }
      }
    } else {
      for (const s of pc.getSenders()) {
        if (s.track && kinds.includes(s.track.kind)) { try { pc.removeTrack(s) } catch { /* ignore */ } }
      }
    }
  }

  private syncAllLocalTracks() {
    for (const pc of this.pcs.values()) this.syncLocalTrack(pc)
  }

  // True when this pc is carrying every required, un-muted local track kind.
  // Muted kinds are intentionally detached (true mute) and don't count as
  // missing, so a cam-off video participant won't renegotiate forever.
  private hasLocalTracks(pc: RTCPeerConnection): boolean {
    const kinds = this.opts.kind === 'video' ? ['audio', 'video'] : ['audio']
    return kinds.every(kind => {
      const muted = (kind === 'audio' && !this.micEnabled) || (kind === 'video' && !this.camEnabled)
      if (muted) return true
      return pc.getSenders().some(s => s.track?.kind === kind)
    })
  }

  private makeOffer(targetId: string) {
    const pc = this.pcs.get(targetId)
    if (!pc) return
    if (pc.signalingState !== 'stable') return
    // Never send a trackless offer. Local media arrives asynchronously (the mic
    // permission prompt can take seconds), so an early offer would establish a
    // media-less connection and the follow-up renegotiation that adds the audio
    // track can be lost — leaving peers with silence. Wait for media instead;
    // reconcile() re-offers as soon as tracks exist.
    if (!this.local) return
    this.syncLocalTrack(pc)
    this.lastOfferAt.set(targetId, Date.now())
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          this.log('sending offer', targetId)
          this.sendSignal(targetId, { type: 'offer', sdp: pc.localDescription.sdp })
        }
      })
      .catch((err) => { this.log('makeOffer error', targetId, err) })
  }

  onSignal(from: string, to: string | null, data: any, sigId?: string) {
    if (this.disposed) return
    const me = this.opts.userId
    if (from === me) return
    if (to && to !== me) return
    this.log('recv signal', from, data?.type, { sigId })
    // Dedupe relayed signals (delivered via both the DB poll and the hub).
    if (sigId) {
      if (this.seenSignalIds.has(sigId)) return
      this.seenSignalIds.add(sigId)
      if (this.seenSignalIds.size > 500) {
        const it = this.seenSignalIds.values().next()
        if (!it.done) this.seenSignalIds.delete(it.value)
      }
    }
    const d = data || {}

    // Keep a connection for anyone who talks to us, even if we haven't yet
    // received the room state that lists them — and attach our local media.
    const pc = this.ensurePc(from)
    this.syncLocalTrack(pc)

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
          .then(() => { if (pc.localDescription) this.sendSignal(from, { type: 'answer', sdp: pc.localDescription.sdp }) })
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
    this.log('send signal', to, data?.type)
    this.opts.sendSignal(to, data)
  }

  setPresence(members: RoomMember[]) {
    this.log('setPresence', members.length, 'peers')
    // Connect to every other participant (both speakers and audience). This
    // guarantees a transport exists so speakers' media reaches the audience and
    // audience members can be promoted to the stage without re-creating peers.
    const peers = new Map<string, RoomMember>()
    for (const m of members) {
      if (m.userId === this.opts.userId) continue
      peers.set(m.userId, m)
    }
    this.livePeers = peers

    const wanted = new Set(peers.keys())
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

  // ── Adaptive video quality (gradient-descent-style controller) ──

  private startQualityTimer() {
    if (this.qualityTimer || this.disposed) return
    this.qualityTimer = setInterval(() => this.runQualityAdaptation(), 1000)
  }

  private async sampleNetwork(): Promise<{ lost: number; received: number; rtt: number } | null> {
    let lost = 0
    let received = 0
    let rtt = 0
    let found = false
    for (const pc of this.pcs.values()) {
      try {
        const stats = await pc.getStats()
        let outbound: any = null
        let remote: any = null
        stats.forEach((s: any) => {
          if (s.type === 'outbound-rtp' && s.kind === 'video' && s.trackIdentifier) outbound = s
          if (s.type === 'remote-inbound-rtp' && s.kind === 'video') remote = s
        })
        if (!outbound) continue
        found = true
        const recv = remote?.packetsReceived || 0
        const lostCount = remote?.packetsLost ?? (typeof outbound.packetsLost === 'number' ? outbound.packetsLost : 0)
        lost += lostCount
        received += recv
        rtt = Math.max(rtt, remote?.roundTripTime || 0)
      } catch { /* ignore */ }
    }
    if (!found) return null
    return { lost, received, rtt }
  }

  private applySenderQuality(pc: RTCPeerConnection, cfg: { scale: number; maxBitrate: number }) {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
    if (!sender) return
    try {
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
      const enc = params.encodings[0]
      enc.maxBitrate = cfg.maxBitrate
      enc.scaleResolutionDownBy = cfg.scale
      sender.setParameters(params).catch(() => {})
    } catch { /* ignore */ }
  }

  private applyQualityLevel(level: number) {
    const cfg = VIDEO_QUALITY_LEVELS[level]
    this.log('quality →', cfg.label, { maxBitrate: cfg.maxBitrate, scale: cfg.scale })
    for (const pc of this.pcs.values()) {
      if (pc.signalingState === 'stable') this.applySenderQuality(pc, cfg)
    }
  }

  private async runQualityAdaptation() {
    if (this.disposed || this.opts.kind !== 'video' || !this.speaker) return
    if (this.pcs.size === 0) return
    if (!this.local || this.local.getVideoTracks().length === 0) return

    const q = this.quality || (this.quality = { level: 0, goodTicks: 0, lossEwma: 0, rttEwma: 0, last: null })

    // Not speaking → hold the highest quality reached during short pauses and
    // only fall back to the lowest rung (144p) after 30s of continuous silence.
    if (!this.speaking) {
      if (this.silentSince === null) this.silentSince = Date.now()
      const silentFor = Date.now() - this.silentSince
      // First run caps at 144p immediately; later runs hold the current level
      // and only step back to 144p after 30s of silence.
      if (!this.qualityApplied || (silentFor >= 30000 && q.level !== 0)) {
        q.last = null
        q.level = 0
        this.applyQualityLevel(0)
        this.qualityApplied = true
        const silentLabel = VIDEO_QUALITY_LEVELS[0].label
        if (silentLabel !== this.lastQualityLabel) {
          this.lastQualityLabel = silentLabel
          this.opts.onQualityChange?.(silentLabel)
        }
      }
      return
    }
    this.silentSince = null

    if (!this.qualityApplied) {
      this.qualityApplied = true
      this.applyQualityLevel(q.level)
    }

    const net = await this.sampleNetwork()
    if (net) {
      // Windowed packet loss over the last tick (gradient of the "cost").
      const lostDelta = q.last ? Math.max(0, net.lost - q.last.lost) : net.lost
      const recvDelta = q.last ? Math.max(0, net.received - q.last.received) : net.received
      const totalDelta = lostDelta + recvDelta
      const loss = totalDelta > 0 ? lostDelta / totalDelta : 0
      q.last = { lost: net.lost, received: net.received }
      q.lossEwma = q.lossEwma * 0.7 + loss * 0.3
      q.rttEwma = q.rttEwma * 0.7 + net.rtt * 0.3
    }

    const loss = q.lossEwma
    const rtt = q.rttEwma
    const maxLevel = VIDEO_QUALITY_LEVELS.length - 1
    let next = q.level

    if (loss > 0.05 || rtt > 700) {
      // Network degraded → step back down the ladder (move against the gradient).
      next = Math.max(0, q.level - 1)
      q.goodTicks = 0
    } else if (q.level < maxLevel) {
      // Climb one rung per clean tick so a speaking user reaches 480p quickly
      // (144p → 240p → 360p → 480p within a few seconds of talking).
      q.goodTicks += 1
      if (q.goodTicks >= 1 && rtt < 350) {
        next = q.level + 1
        q.goodTicks = 0
      }
    } else {
      q.goodTicks = 0
    }

    if (next !== q.level) {
      q.level = next
      this.applyQualityLevel(next)
    }

    const label = VIDEO_QUALITY_LEVELS[q.level].label
    if (label !== this.lastQualityLabel) {
      this.lastQualityLabel = label
      this.opts.onQualityChange?.(label)
    }
  }

  private reconcile() {
    if (this.disposed) return
    if (this.speaker) this.ensureMedia()
    if (this.opts.kind === 'video' && this.speaker) this.startQualityTimer()

    const now = Date.now()
    for (const [id] of this.livePeers) {
      if (!this.pcs.has(id)) {
        this.createPc(id)
        this.syncLocalTrack(this.pcs.get(id)!)
        if (this.isInitiator(id)) this.makeOffer(id)
      } else {
        const pc = this.pcs.get(id)!
        const established = pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'
        // Renegotiate when the transport is up but missing our local tracks.
        // Media (mic permission) can arrive after the first offer, so this is
        // what turns a media-less connection into one that actually carries
        // audio/video. Either side may re-offer (perfect negotiation resolves
        // glare), throttled to once per 4s window.
        const missingTracks = this.speaker && !!this.local && !this.hasLocalTracks(pc)
        if (pc.signalingState === 'stable' && (!established || missingTracks) && (now - (this.lastOfferAt.get(id) || 0)) >= 4000) {
          this.makeOffer(id)
        }
        this.syncLocalTrack(pc)
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
    if (this.qualityTimer) { clearInterval(this.qualityTimer); this.qualityTimer = null }
    for (const pc of this.pcs.values()) { try { pc.close() } catch { /* ignore */ } }
    this.pcs.clear()
    this.remotes.clear()
    this.pendingCandidates.clear()
    this.local?.getTracks().forEach(t => t.stop())
    this.local = null
    this.quality = null
    this.qualityApplied = false
    this.lastQualityLabel = null
    this.silentSince = null
  }
}