import { useState } from 'react'

interface Props {
  onCreate: (name: string) => Promise<void>
  onJoin: (code: string, name: string) => Promise<void>
  errorMessage: string | null
}

export default function Home({ onCreate, onJoin, errorMessage }: Props) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate(name.trim())
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!name.trim() || code.trim().length < 4) return
    setBusy(true)
    try {
      await onJoin(code.trim(), name.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-center font-serif text-4xl font-bold text-gold">Foașca</h1>
      <p className="mb-10 text-center text-sm text-paper/60">joc de cărți multiplayer</p>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-bad bg-bad/10 px-4 py-2 text-sm text-bad">{errorMessage}</div>
      )}

      {mode === 'choose' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setMode('create')}
            className="rounded-md bg-gold py-4 text-lg font-bold text-felt-950 active:opacity-80"
          >
            Creează o cameră
          </button>
          <button
            onClick={() => setMode('join')}
            className="rounded-md border border-felt-600 bg-felt-800 py-4 text-lg font-bold text-paper active:bg-felt-700"
          >
            Intră cu un cod
          </button>
        </div>
      )}

      {mode !== 'choose' && (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-paper/70">Numele tău</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Veniamin"
            className="rounded-md border border-felt-600 bg-felt-800 px-4 py-3 text-paper outline-none focus:border-gold"
            maxLength={24}
          />

          {mode === 'join' && (
            <>
              <label className="mt-2 text-sm text-paper/70">Codul camerei</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex: ABCD7"
                className="rounded-md border border-felt-600 bg-felt-800 px-4 py-3 text-center text-2xl tracking-[0.3em] text-paper outline-none focus:border-gold"
                maxLength={5}
              />
            </>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setMode('choose')}
              className="flex-1 rounded-md border border-felt-600 bg-felt-800 py-3 font-medium text-paper active:bg-felt-700"
            >
              Înapoi
            </button>
            <button
              disabled={busy}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              className="flex-1 rounded-md bg-good py-3 font-bold text-felt-950 disabled:opacity-50"
            >
              {mode === 'create' ? 'Creează' : 'Intră'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
