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
        <h1 className="gradient-text">{t('title')}</h1>
        <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', marginBottom: '1.4rem', marginTop: '0.15rem', fontWeight: 600 }}>
          {t('localGame')}
        </p>

        {names.map((name, index) => (
          <label className="name-field" key={`player-${index + 1}`}>
            <span className="label">{t('player')} {index + 1}</span>
            <div className="input-row">
              <input
                className="field-input"
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
                className="icon-btn"
                disabled={names.length <= 2}
                aria-label={`Xóa Người chơi ${index + 1}`}
                onClick={() =>
                  setNames((current) =>
                    current.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
              >
                ✕
              </button>
            </div>
          </label>
        ))}

        <p className="player-count"><strong>{names.length}</strong>/8 người chơi</p>

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
            + {t('addPlayer')}
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

        {localError && names.some((n) => !n.trim()) && (
          <p className="error">Nhập 2–8 tên người chơi hợp lệ.</p>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  )
}
