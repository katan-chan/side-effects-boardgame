import { useEffect, useRef } from 'react'
import { t } from '../i18n'

interface FinishedScreenProps {
  winnerName: string
  onNewGame: () => void
  actionLabel?: string
}

export function FinishedScreen({
  winnerName,
  onNewGame,
  actionLabel,
}: FinishedScreenProps) {
  const confettiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = confettiRef.current
    if (!wrap) return
    const colors = ['#14b8a6','#22c55e','#eab308','#a855f7','#f87171','#f8fafc']
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i')
      p.style.left = (Math.random() * 100) + '%'
      p.style.background = colors[Math.floor(Math.random() * colors.length)]
      p.style.animationDuration = (3 + Math.random() * 3) + 's'
      p.style.animationDelay = (Math.random() * 2) + 's'
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)'
      wrap.appendChild(p)
    }
    return () => { while (wrap.firstChild) wrap.removeChild(wrap.firstChild) }
  }, [])

  return (
    <div className="finished-screen">
      <div className="confetti" ref={confettiRef} />
      <section className="winner-panel">
        <span className="winner-crown">👑</span>
        <div className="winner-lbl">Người chiến thắng</div>
        <h1 className="winner-name">{winnerName}</h1>
        <p className="winner-sub">{t('wins', { player: winnerName })} 🎉</p>
        <button type="button" className="primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onNewGame}>
          {actionLabel ?? t('newGame')}
        </button>
      </section>
    </div>
  )
}
