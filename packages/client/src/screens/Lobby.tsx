import { ClientGameState } from '@foaica/shared'

interface Props {
  state: ClientGameState
  onStart: () => void
  onKick: (playerId: string) => void
  onLeave: () => void
}

export default function Lobby({ state, onStart, onKick, onLeave }: Props) {
  const isHost = state.myId === state.hostId
  const canStart = state.players.length >= 2

  function copyCode() {
    navigator.clipboard?.writeText(state.roomCode).catch(() => {})
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col px-6 py-10">
      <h1 className="mb-1 text-center font-serif text-3xl font-bold text-gold">Foașca</h1>
      <p className="mb-6 text-center text-sm text-paper/60">lobby</p>

      <div className="mb-6 rounded-lg border border-gold/40 bg-felt-800 p-5 text-center">
        <p className="mb-1 text-xs uppercase tracking-widest text-paper/50">Cod cameră</p>
        <button onClick={copyCode} className="font-mono text-4xl font-bold tracking-[0.3em] text-gold">
          {state.roomCode}
        </button>
        <p className="mt-1 text-xs text-paper/40">apasă pentru a copia</p>
      </div>

      <p className="mb-2 text-sm text-paper/70">
        Jucători conectați ({state.players.length}/6)
      </p>
      <ul className="mb-6 divide-y divide-felt-700 rounded-md border border-felt-700 bg-felt-900">
        {state.players.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-good' : 'bg-bad'}`} />
              <span className="text-paper">{p.name}</span>
              {p.isHost && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">HOST</span>}
            </span>
            {isHost && !p.isHost && (
              <button onClick={() => onKick(p.id)} className="text-xs text-bad active:opacity-60">
                elimină
              </button>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          disabled={!canStart}
          onClick={onStart}
          className="rounded-md bg-good py-4 text-lg font-bold text-felt-950 disabled:cursor-not-allowed disabled:bg-felt-700 disabled:text-paper/40"
        >
          START JOC
        </button>
      ) : (
        <p className="text-center text-sm text-paper/50">Se așteaptă ca hostul să pornească jocul…</p>
      )}
      {!canStart && isHost && <p className="mt-2 text-center text-xs text-paper/40">Minim 2 jucători.</p>}

      <button onClick={onLeave} className="mt-8 text-center text-xs text-paper/40 underline">
        Părăsește camera
      </button>
    </div>
  )
}
