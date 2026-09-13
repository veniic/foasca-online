import { ClientGameState, SUIT_SYMBOL, isJackOfClubs } from '@foaica/shared'

interface Props {
  state: ClientGameState
}

export default function TrumpCard({ state }: Props) {
  if (state.noTrump && state.trumpCard) {
    // J♣ a fost cartea de coz => nu există coz în rundă. Afișăm totuși cartea
    // reală (e important vizual să se vadă CE a fost jucat, nu doar un text),
    // dar marcată clar drept "fără coz".
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative flex h-[4.2rem] w-[3rem] flex-col justify-between rounded-md border-2 border-paper/30 bg-felt-900 px-1.5 py-1 text-paper shadow-lg">
          <span className="text-xs font-bold">{state.trumpCard.rank}</span>
          <span className="self-center text-xl">★</span>
          <span className="self-end rotate-180 text-xs font-bold">{state.trumpCard.rank}</span>
        </div>
        <span className="whitespace-nowrap rounded bg-felt-900/90 px-1.5 py-0.5 text-[9px] font-medium text-paper/60">
          fără coz (J♣)
        </span>
      </div>
    )
  }

  if (!state.trumpSuit || !state.trumpCard) return null

  const isRed = state.trumpSuit === 'hearts' || state.trumpSuit === 'diamonds'
  const special = isJackOfClubs(state.trumpCard)

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative flex h-[4.2rem] w-[3rem] flex-col justify-between rounded-md border-2 border-gold bg-paper px-1.5 py-1 shadow-[0_0_10px_rgba(201,162,75,0.5)] ${
          isRed ? 'text-redsuit' : 'text-felt-950'
        }`}
      >
        <span className="text-xs font-bold">{state.trumpCard.rank}</span>
        <span className="self-center text-2xl">{SUIT_SYMBOL[state.trumpSuit]}</span>
        <span className="self-end rotate-180 text-xs font-bold">{state.trumpCard.rank}</span>
        {special && <span className="absolute -right-1 -top-1 text-[9px]">★</span>}
      </div>
      <span className="whitespace-nowrap rounded bg-felt-900/90 px-1.5 py-0.5 text-[9px] font-medium text-gold">
        COZ {SUIT_SYMBOL[state.trumpSuit]}
      </span>
    </div>
  )
}
