type SoundType = 'draw' | 'drug-play' | 'disorder-play' | 'therapy-play' | 'episode' | 'discard' | 'your-turn' | 'win' | 'lose' | 'pending-alert' | 'click'

interface AudioSettings {
  volume: number
  muted: boolean
}

const STORAGE_KEY = 'side-effect.audio'

class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private settings: AudioSettings = { volume: 0.65, muted: false }
  private lastPlayTimes: Map<SoundType, number> = new Map()

  constructor() {
    this.loadSettings()
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        this.initContext()
        window.removeEventListener('click', initAudio)
        window.removeEventListener('touchstart', initAudio)
      }
      window.addEventListener('click', initAudio, { passive: true })
      window.addEventListener('touchstart', initAudio, { passive: true })
    }
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.settings.volume = typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.65
        this.settings.muted = !!parsed.muted
      }
    } catch {
      // Ignore
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch {
      // Ignore
    }
    this.updateMasterGain()
  }

  getVolume() {
    return this.settings.volume
  }

  isMuted() {
    return this.settings.muted
  }

  setVolume(vol: number) {
    this.settings.volume = Math.max(0, Math.min(1, vol))
    this.saveSettings()
  }

  setMuted(muted: boolean) {
    this.settings.muted = muted
    this.saveSettings()
  }

  private initContext() {
    if (this.ctx) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    this.ctx = new AudioContextClass()
    this.masterGain = this.ctx.createGain()
    this.masterGain.connect(this.ctx.destination)
    this.updateMasterGain()
  }

  private updateMasterGain() {
    if (!this.masterGain || !this.ctx) return
    const val = this.settings.muted ? 0 : Math.pow(this.settings.volume, 2) // Non-linear for better UX
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05)
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 1, attack = 0.01) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(this.masterGain)
    
    const now = this.ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    
    osc.start(now)
    osc.stop(now + duration)
  }

  private playNoise(duration: number, vol = 1, attack = 0.01) {
    if (!this.ctx || !this.masterGain) return
    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1000
    
    const gain = this.ctx.createGain()
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    
    const now = this.ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack)
    gain.gain.linearRampToValueAtTime(0, now + duration)
    
    noise.start(now)
  }

  play(event: SoundType) {
    if (this.settings.muted) return
    if (!this.ctx) this.initContext()
    if (!this.ctx) return

    // Limit fast retriggering
    const now = Date.now()
    const last = this.lastPlayTimes.get(event) || 0
    if (now - last < 50) return
    this.lastPlayTimes.set(event, now)

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }



    switch (event) {
      case 'click':
        this.playTone(600, 'sine', 0.05, 0.2, 0.005)
        break
      case 'draw':
      case 'discard':
        this.playNoise(0.15, 0.3, 0.02)
        break
      case 'drug-play':
        this.playTone(200, 'triangle', 0.1, 0.4, 0.01)
        break
      case 'disorder-play':
        this.playNoise(0.05, 0.6, 0.01)
        this.playTone(150, 'square', 0.1, 0.3, 0.01)
        break
      case 'therapy-play':
        this.playTone(440, 'sine', 0.4, 0.3, 0.1)
        this.playTone(554, 'sine', 0.4, 0.3, 0.1) // C#
        break
      case 'episode':
        this.playTone(80, 'sawtooth', 0.5, 0.6, 0.05)
        break
      case 'your-turn':
        this.playTone(600, 'sine', 0.1, 0.4, 0.01)
        setTimeout(() => this.playTone(800, 'sine', 0.3, 0.4, 0.01), 100)
        break
      case 'pending-alert':
        this.playTone(500, 'triangle', 0.1, 0.3, 0.02)
        break
      case 'win':
        this.playTone(440, 'sine', 0.2, 0.5, 0.05)
        setTimeout(() => this.playTone(554, 'sine', 0.2, 0.5, 0.05), 150)
        setTimeout(() => this.playTone(659, 'sine', 0.4, 0.5, 0.05), 300)
        break
      case 'lose':
        this.playTone(300, 'triangle', 0.3, 0.5, 0.05)
        setTimeout(() => this.playTone(250, 'triangle', 0.5, 0.5, 0.05), 250)
        break
    }
  }
}

export const audioManager = new AudioManager()
