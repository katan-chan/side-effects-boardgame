import { useState } from 'react'
import { t } from '../i18n'

interface SetupScreenProps {
  error?: string
  onStart: (names: string[]) => void
}

export function SetupScreen({ error, onStart }: SetupScreenProps) {
  const [names, setNames] = useState([`${t('player')} 1`, `${t('player')} 2`])
  const localError =
    names.length < 2 || names.length > 8 || names.some((name) => !name.trim())

  return (
    <main className="setup-screen">
      <section className="panel">
        <h1>{t('title')}</h1>
        <p>{t('localGame')}</p>
        {names.map((name, index) => (
          <label className="name-field" key={`player-${index + 1}`}>
            {t('player')} {index + 1}
            <span>
              <input
                value={name}
                onChange={(event) =>
                  setNames((current) =>
                    current.map((value, currentIndex) =>
                      currentIndex === index ? event.target.value : value,
                    ),
                  )
                }
              />
              <button
                type="button"
                disabled={names.length <= 2}
                onClick={() =>
                  setNames((current) =>
                    current.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
              >
                {t('remove')}
              </button>
            </span>
          </label>
        ))}
        <div className="button-row">
          <button
            type="button"
            disabled={names.length >= 8}
            onClick={() =>
              setNames((current) => [
                ...current,
                `${t('player')} ${current.length + 1}`,
              ])
            }
          >
            {t('addPlayer')}
          </button>
          <button
            type="button"
            className="primary"
            disabled={localError}
            onClick={() => onStart(names.map((name) => name.trim()))}
          >
            {t('startGame')}
          </button>
        </div>
        {localError && (
          <p className="error">Enter 2–8 non-empty player names.</p>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )
}
