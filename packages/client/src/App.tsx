import { useGame } from './hooks/useGame'
import Home from './screens/Home'
import Lobby from './screens/Lobby'
import GameTable from './screens/GameTable'
import FinalResults from './screens/FinalResults'

export default function App() {
  const {
    state,
    connecting,
    errorMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    kickPlayer,
    submitBid,
    submitPeek,
    playCard,
    playHiddenCard,
    continueAfterRound,
  } = useGame()

  if (connecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-paper/50">Se conectează…</p>
      </div>
    )
  }

  if (!state) {
    return <Home onCreate={createRoom} onJoin={joinRoom} errorMessage={errorMessage} />
  }

  if (state.phase === 'LOBBY') {
    return <Lobby state={state} onStart={startGame} onKick={kickPlayer} onLeave={leaveRoom} />
  }

  if (state.phase === 'FINAL_RESULT') {
    return <FinalResults state={state} onLeave={leaveRoom} />
  }

  return (
    <>
      {errorMessage && (
        <div className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-md border border-bad bg-felt-950 px-4 py-2 text-sm text-bad shadow-lg">
          {errorMessage}
        </div>
      )}
      <GameTable
        state={state}
        onSubmitBid={submitBid}
        onSubmitPeek={submitPeek}
        onPlayCard={playCard}
        onPlayHiddenCard={playHiddenCard}
        onContinueAfterRound={continueAfterRound}
      />
    </>
  )
}
