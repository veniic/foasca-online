import { ClientGameState, TOTAL_ROUNDS } from '@foaica/shared'

interface Props {
  state: ClientGameState
  onClose: () => void
}

export default function ScoreSheet({ state, onClose }: Props) {
  const rounds = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-felt-950/98 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-gold">Foaia de scor</h2>
        <button onClick={onClose} className="rounded-md border border-felt-600 px-3 py-1.5 text-sm text-paper">
          Închide
        </button>
      </div>
      <div className="flex-1 overflow-auto rounded-md border border-felt-700">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-felt-800">
              <th className="sticky left-0 z-10 bg-felt-800 px-3 py-2 text-left">Runda</th>
              {state.players.map((p) => (
                <th key={p.id} className="min-w-[4.5rem] px-3 py-2 text-right">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => {
              const entry = state.history.find((h) => h.round === r)
              return (
                <tr key={r} className="odd:bg-felt-900 even:bg-felt-950">
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium">{r}</td>
                  {state.players.map((p) => {
                    const score = entry?.scores[p.id]
                    return (
                      <td
                        key={p.id}
                        className={`px-3 py-2 text-right ${
                          score === undefined ? 'text-paper/30' : score < 0 ? 'text-bad' : 'text-good'
                        }`}
                      >
                        {score === undefined ? '—' : score < 0 ? 'X' : `+${score}`}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr className="bg-felt-800">
              <td className="sticky left-0 z-10 bg-felt-800 px-3 py-2 font-bold text-gold">TOTAL</td>
              {state.players.map((p) => (
                <td key={p.id} className="px-3 py-2 text-right font-bold text-gold">
                  {state.totals[p.id] ?? 0}
                </td>
              ))}
            </tr>
            <tr className="bg-felt-800">
              <td className="sticky left-0 z-10 bg-felt-800 px-3 py-2 font-bold text-gold">BILE</td>
              {state.players.map((p) => (
                <td key={p.id} className="px-3 py-2 text-right font-bold text-gold">
                  {state.biles[p.id] ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
