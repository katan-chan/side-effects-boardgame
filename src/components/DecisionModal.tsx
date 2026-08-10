import { useState } from 'react'
import type { PendingDecisionView } from '../../server/game/playerView'
import { t } from '../i18n'

interface DecisionModalProps {
  decision: PendingDecisionView
  viewerPlayerId: string
  onResolve: (decisionId: string, choiceIds: string[]) => void
}

const cardTypeLabel: Record<string, string> = {
  drug: 'Thuốc',
  disorder: 'Rối loạn',
  therapy: 'Trị liệu',
  episode: 'Cơn khủng hoảng',
}

export function DecisionModal({ decision, viewerPlayerId, onResolve }: DecisionModalProps) {
  const isChooser = decision.chooserPlayerId === viewerPlayerId
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  if (!isChooser) {
    return (
      <div className="decision-overlay">
        <div className="decision-modal">
          <span className="decision-tag">⏳ Đang chờ</span>
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

  const episodeLabel = isAnxiety ? '⚡ Cơn phát bệnh · Lo âu' : '⚡ Cơn phát bệnh · Run rẩy'

  return (
    <div className="decision-overlay">
      <div className="decision-modal">
        <span className="decision-tag">{episodeLabel}</span>
        <h2>{t(isAnxiety ? 'anxietyDecision' : 'tremorsDecision')}</h2>
        <p>{t(isAnxiety ? 'anxietyPrompt' : 'tremorsPrompt')}</p>

        <div className="decision-choices">
          {choices.map((choice) => {
            const cardType = (choice as { cardType?: string }).cardType
            return (
              <label key={choice.id} className="decision-choice">
                <input
                  type={isAnxiety ? 'radio' : 'checkbox'}
                  name="decision_choice"
                  value={choice.id}
                  checked={selectedIds.includes(choice.id)}
                  onChange={() => handleToggle(choice.id)}
                />
                <span className="c-name">{choice.label}</span>
                {cardType && (
                  <span className={`c-type type-${cardType}`}>
                    {cardTypeLabel[cardType] ?? cardType}
                  </span>
                )}
              </label>
            )
          })}
        </div>

        {isTremors && (
          <div className="decision-progress">
            <div className="p-row">
              <span>{selectedIds.length}/{Math.min(3, choices.length)} đã chọn</span>
            </div>
            <div className="p-bar">
              <div
                className="p-fill"
                style={{ width: `${(selectedIds.length / Math.min(3, choices.length)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="primary"
          disabled={!isValid}
          onClick={() => onResolve(decision.id, selectedIds)}
        >
          ✓ {t('confirm')}
        </button>
      </div>
    </div>
  )
}
