import { ClientGameState } from '@foaica/shared'
import ScoreSheet from './ScoreSheet'
import { useState } from 'react'

interface Props {
  state: ClientGameState
  onLeave: () => void
}

export default function FinalResults({ state, onLeave }: Props) {
  const [showSheet, setShowSheet] = useState(false)
  const ranking = state.finalRanking ?? []
  const winner = ranking[0]

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10 text-center">
      <p className="mb-1 text-5xl">🏆</p>
      <p className="mb-1 text-xs uppercase tracking-widest text-paper/50">Câștigător</p>
      <h1 className="mb-8 font-serif text-3xl font-bold text-gold">{winner?.name ?? '—'}</h1>

      <ul className="mb-8 divide-y divide-felt-700 rounded-md border border-felt-700 bg-felt-900 text-left">
        {ranking.map((r, i) => (
          <li key={r.playerId} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="w-5 text-paper/50">{i + 1}.</span>
              <span className="text-paper">{r.name}</span>
            </span>
            <span className="text-right">
              <span className="block font-bold text-gold">{r.total}</span>
              <span className="block text-xs text-paper/40">{r.bile} bile</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => setShowSheet(true)}
        className="mb-3 rounded-md border border-felt-600 bg-felt-800 py-3 font-medium text-paper active:bg-felt-700"
      >
        Vezi foaia completă de scor
      </button>
      <button onClick={onLeave} className="rounded-md bg-gold py-3 font-bold text-felt-950 active:opacity-80">
        Joc nou
      </button>

      {showSheet && <ScoreSheet state={state} onClose={() => setShowSheet(false)} />}
    </div>
  )
}
