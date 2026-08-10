import { t } from '../i18n'
import type { PlayerState } from '../game/engine/types'
import type { PlayerView } from '../../server/game/playerView'

type BoardPlayer = PlayerState | PlayerView

interface OpponentAvatarBarProps {
  opponents: BoardPlayer[]
  focusedOpponentId?: string
  setFocusedOpponentId: (id: string) => void
  targetPlayerId?: string
}

export function OpponentAvatarBar({
  opponents,
  focusedOpponentId,
  setFocusedOpponentId,
  targetPlayerId,
}: OpponentAvatarBarProps) {
  return (
    <section className="opponent-avatar-bar">
      {opponents.map((opponent) => {
        const isFocused = opponent.id === focusedOpponentId
        const isTargeted = opponent.id === targetPlayerId
        const effects = opponent.effects

        return (
          <button
            key={opponent.id}
            type="button"
            className={`opponent-avatar ${isFocused ? 'focused' : ''} ${isTargeted ? 'targeted' : ''}`}
            onClick={() => setFocusedOpponentId(opponent.id)}
          >
            <div className="avatar-icon">{opponent.name.slice(0, 1).toUpperCase()}</div>
            <div className="avatar-info">
              <strong>{opponent.name}</strong>
              <small>
                {t('hand')}: {'handCount' in opponent ? opponent.handCount : opponent.hand.length}
              </small>
            </div>
            {(effects.skipTurns > 0 ||
              effects.skipDrawTurns > 0 ||
              effects.cannotPlayTurns > 0) && (
              <div className="avatar-effects">
                {effects.skipTurns > 0 && '🚫'}
                {effects.skipDrawTurns > 0 && '🛑'}
                {effects.cannotPlayTurns > 0 && '🔒'}
              </div>
            )}
          </button>
        )
      })}
    </section>
  )
}
