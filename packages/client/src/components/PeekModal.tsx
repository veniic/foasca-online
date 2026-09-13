import { PeekChoice } from '@foaica/shared'

interface Props {
  onAnswer: (choice: PeekChoice) => void
}

export default function PeekModal({ onAnswer }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-xs rounded-lg border border-gold/50 bg-felt-900 p-6 text-center">
        <p className="mb-1 text-xs uppercase tracking-widest text-paper/50">Runda 14</p>
        <p className="mb-6 text-xl font-bold text-gold">Te-ai uitat la carte?</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onAnswer('peek')}
            className="rounded-md bg-gold py-4 font-bold text-felt-950 active:opacity-80"
          >
            DA, M-AM UITAT
          </button>
          <button
            onClick={() => onAnswer('noPeek')}
            className="rounded-md border border-felt-600 bg-felt-800 py-4 font-bold text-paper active:bg-felt-700"
          >
            NU, NU M-AM UITAT
          </button>
        </div>
        <p className="mt-4 text-xs text-paper/40">Răspunsul tău rămâne secret până la calculul scorului.</p>
      </div>
    </div>
  )
}
