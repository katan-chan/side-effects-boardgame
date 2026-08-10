import { FinishedScreen } from '../components/FinishedScreen'
import { GameBoard } from '../components/GameBoard'
import { SetupScreen } from '../components/SetupScreen'
import { useGameStore } from '../store/gameStore'
import '../styles.css'

export function App() {
  const store = useGameStore()
  const game = store.gameState
  if (!game)
    return <SetupScreen error={store.error} onStart={store.createLocalGame} />
  if (game.status === 'finished') {
    const winner = game.players.find(
      (player) => player.id === game.winnerPlayerId,
    )
    return (
      <FinishedScreen
        winnerName={winner?.name ?? 'A player'}
        onNewGame={store.resetGame}
      />
    )
  }
  return (
    <GameBoard
      game={game}
      error={store.error}
      gameLog={store.gameLog}
      onDraw={store.draw}
      onEndTurn={store.endTurn}
      onDiscard={store.discard}
      onPlayDrug={store.playDrug}
      onPlayDisorder={store.playDisorder}
      onPlayEpisode={store.playEpisode}
      onPlayTherapy={store.playTherapy}
    />
  )
}
