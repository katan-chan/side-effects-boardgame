import { useState } from 'react'
import { audioManager } from '../audio/audioManager'


export function AudioSettings() {
  const [muted, setMuted] = useState(audioManager.isMuted())
  const [volume, setVolume] = useState(audioManager.getVolume())
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="audio-settings" style={{ position: 'relative' }}>
      <button 
        type="button" 
        className="icon-btn action-btn secondary" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Audio Settings"
        style={{ padding: '0.5rem', minWidth: '40px' }}
      >
        {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
      </button>
      {isOpen && (
        <div 
          className="audio-popover panel" 
          style={{ 
            position: 'absolute', 
            bottom: '100%', 
            right: 0, 
            marginBottom: '0.5rem', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 1000
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              checked={muted} 
              onChange={(e) => {
                const m = e.target.checked
                setMuted(m)
                audioManager.setMuted(m)
                if (!m) audioManager.play('click')
              }} 
            />
            Mute
          </label>
          <input 
            type="range" 
            min="0" max="1" step="0.05" 
            value={volume} 
            disabled={muted}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              setVolume(v)
              audioManager.setVolume(v)
            }}
            onMouseUp={() => audioManager.play('click')}
            onTouchEnd={() => audioManager.play('click')}
            aria-label="Volume"
          />
        </div>
      )}
    </div>
  )
}
