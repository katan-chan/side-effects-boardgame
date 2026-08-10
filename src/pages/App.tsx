import { useState } from 'react'
import { FinishedScreen } from '../components/FinishedScreen'
import { GameBoard } from '../components/GameBoard'
import { HomeScreen } from '../components/HomeScreen'
import { OnlineLobby } from '../components/OnlineLobby'
import { SetupScreen } from '../components/SetupScreen'
import { useGameStore } from '../store/gameStore'
import '../styles.css'

export function App() {
  const [mode, setMode] = useState<'home' | 'local' | 'online'>('home')
  const store = useGameStore()
  const game = store.gameState
  if (mode === 'home')
    return (
      <HomeScreen
        onLocal={() => setMode('local')}
        onOnline={() => setMode('online')}
      />
    )
  if (mode === 'online') return <OnlineLobby onBack={() => setMode('home')} />
  if (!game)
    return <SetupScreen error={store.error} onStart={store.createLocalGame} />
  if (game.status === 'finished') {
    const winner = game.players.find(
      (player) => player.id === game.winnerPlayerId,
    )
    return (
      <FinishedScreen
        winnerName={winner?.name ?? 'A player'}
        onNewGame={() => {
          store.resetGame()
          setMode('home')
        }}
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
      onForfeit={store.forfeit}
      onClearError={store.clearError}
      onDiscard={store.discard}
      onManualDiscard={store.manualDiscard}
      onPlayDrug={store.playDrug}
      onPlayDisorder={store.playDisorder}
      onPlayEpisode={store.playEpisode}
      onPlayTherapy={store.playTherapy}
    />
  )
}
