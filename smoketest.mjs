import { io } from 'socket.io-client'

const URL = 'http://localhost:3001'

function connect() {
  return io(URL, { transports: ['websocket'] })
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve))
}

function emitAsync(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => (res.ok ? resolve(res) : reject(new Error(res.error))))
  })
}

async function main() {
  const s1 = connect()
  const s2 = connect()
  await Promise.all([once(s1, 'connect'), once(s2, 'connect')])

  let state1 = null
  let state2 = null
  s1.on('state', (s) => (state1 = s))
  s2.on('state', (s) => (state2 = s))

  const created = await emitAsync(s1, 'createRoom', { playerName: 'Veniamin' })
  console.log('Room created:', created.roomCode)

  const joined = await emitAsync(s2, 'joinRoom', { roomCode: created.roomCode, playerName: 'Andrei' })
  console.log('Player 2 joined')

  await new Promise((r) => setTimeout(r, 200))
  if (!state1 || state1.players.length !== 2) throw new Error('Lobby sync failed')
  console.log('Lobby synced across both sockets: OK, players =', state1.players.map((p) => p.name))

  await emitAsync(s1, 'startGame', { roomCode: created.roomCode })
  await new Promise((r) => setTimeout(r, 200))
  if (state1.phase !== 'BIDDING' || state2.phase !== 'BIDDING') throw new Error('Game did not start on both clients')
  console.log('Game started on both clients: OK')

  // Confidențialitate: fiecare vede propria mână, dar nu a celuilalt.
  if (!state1.myHand.length) throw new Error('P1 should see own hand')
  const otherHandCount = state1.players.find((p) => p.id !== state1.myId).handCount
  if (otherHandCount !== 1) throw new Error('Round 1 should deal 1 card')
  console.log('Privacy OK: p1 sees own hand, only handCount for p2 =', otherHandCount)

  // Verificare directă a fix-ului cerut: dacă A cere o valoare, B trebuie să
  // poată cere ACEEAȘI valoare (nu trebuie să devină indisponibilă doar pentru
  // că A a ales-o). Testăm asta explicit pe runda curentă (1 carte).
  {
    const bidderState = state1.currentTurnPlayerId === state1.myId ? state1 : state2
    const bidderSocket = state1.currentTurnPlayerId === state1.myId ? s1 : s2
    const otherSocket = bidderSocket === s1 ? s2 : s1
    const chosen = bidderState.validBidOptions.find((o) => o !== 'PASS') ?? bidderState.validBidOptions[0]
    await emitAsync(bidderSocket, 'submitBid', { roomCode: created.roomCode, bid: chosen })
    await new Promise((r) => setTimeout(r, 150))
    const otherState = bidderSocket === s1 ? state2 : state1
    if (!otherState.validBidOptions.includes(chosen)) {
      throw new Error(`BUG REPRODUS: al doilea jucător NU mai poate cere valoarea ${chosen} aleasă de primul!`)
    }
    console.log(`Fix confirmat: primul a cerut ${chosen}, al doilea poate cere tot ${chosen} ->`, otherState.validBidOptions)
    // finalizăm cererea acestei runde ca să nu rămânem blocați (alegem orice opțiune validă)
    await emitAsync(otherSocket, 'submitBid', { roomCode: created.roomCode, bid: otherState.validBidOptions[0] })
    await new Promise((r) => setTimeout(r, 150))
  }

  // Joacă toată partida automat, alegând prima opțiune validă mereu.
  let steps = 0
  let checkedRound14Privacy = false
  while (state1.phase !== 'FINAL_RESULT') {
    steps++
    if (steps > 5000) throw new Error('Prea mulți pași, posibil blocaj')

    if (state1.round === 14 && !checkedRound14Privacy && state1.phase === 'ROUND_14_LOOK_PHASE') {
      checkedRound14Privacy = true
      if (state1.hiddenCardPending !== true || state2.hiddenCardPending !== true) {
        throw new Error('Runda 14 ar trebui să pornească cu cartea ascunsă pentru ambii jucători')
      }
      if (state1.myHand.length !== 0 || state2.myHand.length !== 0) {
        throw new Error('BUG: cartea rundei 14 a fost trimisă clientului înainte de decizie!')
      }
      console.log('Runda 14: cartea e corect ascunsă pentru ambii jucători înainte de decizie: OK')
    }

    const currentState = state1.currentTurnPlayerId === state1.myId ? state1 : state2
    const currentSocket = state1.currentTurnPlayerId === state1.myId ? s1 : s2

    if (currentState.phase === 'BIDDING' && currentState.currentTurnPlayerId === currentState.myId) {
      await emitAsync(currentSocket, 'submitBid', {
        roomCode: created.roomCode,
        bid: currentState.validBidOptions[0],
      })
    } else if (currentState.phase === 'ROUND_14_LOOK_PHASE') {
      for (const [st, sock] of [[state1, s1], [state2, s2]]) {
        if (st.awaitingMyPeekAnswer) {
          await emitAsync(sock, 'submitPeek', { roomCode: created.roomCode, choice: 'noPeek' })
        }
      }
    } else if (currentState.phase === 'PLAYING_TRICK' && currentState.currentTurnPlayerId === currentState.myId) {
      if (currentState.hiddenCardPending) {
        await emitAsync(currentSocket, 'playHiddenCard', { roomCode: created.roomCode })
      } else {
        const cardId = currentState.validCardIds[0]
        const card = currentState.myHand.find((c) => `${c.rank}-${c.suit}` === cardId)
        await emitAsync(currentSocket, 'playCard', { roomCode: created.roomCode, card })
      }
    } else if (state1.phase === 'ROUND_RESULT') {
      // doar hostul continuă
      await emitAsync(s1, 'continueAfterRound', { roomCode: created.roomCode })
    }
    await new Promise((r) => setTimeout(r, 30))
  }

  console.log('Joc complet până la FINAL_RESULT: OK')
  console.log('Clasament final:', state1.finalRanking)
  if (state1.history.length !== 14) throw new Error('Nu s-au jucat toate cele 14 runde')
  console.log('Toate cele 14 runde jucate: OK')

  s1.disconnect()
  s2.disconnect()
  console.log('\n✅ SMOKE TEST TRECUT — multiplayer real-time funcțional cap-la-cap')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ SMOKE TEST EȘUAT:', err)
  process.exit(1)
})
