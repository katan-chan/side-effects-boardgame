import { useState } from 'react'
import type { PendingDecisionView } from '../../server/game/playerView'
import { t } from '../i18n'

interface DecisionModalProps {
  decision: PendingDecisionView
  viewerPlayerId: string
  onResolve: (decisionId: string, choiceIds: string[]) => void
}

export function DecisionModal({ decision, viewerPlayerId, onResolve }: DecisionModalProps) {
  const isChooser = decision.chooserPlayerId === viewerPlayerId
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (!isChooser) {
    return (
      <div className="decision-overlay">
        <div className="decision-modal panel">
          <h2>{t('waitingForDecision')}</h2>
          <p>{t('waitingForOpponentToResolve', { kind: decision.kind })}</p>
        </div>
      </div>
    )
  }

  const isAnxiety = decision.kind === 'anxiety'
  const isTremors = decision.kind === 'tremors'
  const choices = decision.choices ?? []

  const handleToggle = (id: string) => {
    if (isAnxiety) {
      setSelectedIds([id])
    } else {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      )
    }
  }

  const isValid =
    (isAnxiety && selectedIds.length === 1) ||
    (isTremors && selectedIds.length === 3) ||
    (isTremors && choices.length < 3 && selectedIds.length === choices.length)

  return (
    <div className="decision-overlay">
      <div className="decision-modal panel">
        <h2>{t(isAnxiety ? 'anxietyDecision' : 'tremorsDecision')}</h2>
        <p>{t(isAnxiety ? 'anxietyPrompt' : 'tremorsPrompt')}</p>
        
        <div className="decision-choices">
          {choices.map((choice) => (
            <label key={choice.id} className="decision-choice">
              <input
                type={isAnxiety ? 'radio' : 'checkbox'}
                name="decision_choice"
                value={choice.id}
                checked={selectedIds.includes(choice.id)}
                onChange={() => handleToggle(choice.id)}
              />
              {choice.label}
            </label>
          ))}
        </div>

        <button
          type="button"
          className="primary"
          disabled={!isValid}
          onClick={() => onResolve(decision.id, selectedIds)}
        >
          {t('confirm')}
        </button>
      </div>
    </div>
  )
}
