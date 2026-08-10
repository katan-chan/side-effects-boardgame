interface FinishedScreenProps {
  winnerName: string
  onNewGame: () => void
}

export function FinishedScreen({ winnerName, onNewGame }: FinishedScreenProps) {
  return (
    <section className="finished-screen panel">
      <h1>{winnerName} wins!</h1>
      <button type="button" className="primary" onClick={onNewGame}>
        New Game
      </button>
    </section>
  )
}
