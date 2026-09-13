import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bid, Card, ClientGameState, PeekChoice } from '@foaica/shared'
import { socket } from '../socket'

const STORAGE_KEY = 'foaica-session-v1'

interface StoredSession {
  roomCode: string
  sessionToken: string
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useGame() {
  const [state, setState] = useState<ClientGameState | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const sessionRef = useRef<StoredSession | null>(loadSession())

  useEffect(() => {
    function onState(s: ClientGameState) {
      setState(s)
      setConnecting(false)
    }
    function onErrorToast(message: string) {
      setErrorMessage(message)
      setTimeout(() => setErrorMessage((cur) => (cur === message ? null : cur)), 4000)
    }
    function onConnect() {
      const session = sessionRef.current
      if (session) {
        socket.emit('rejoinRoom', session, (res) => {
          if (!res.ok) {
            clearSession()
            sessionRef.current = null
          }
          setConnecting(false)
        })
      } else {
        setConnecting(false)
      }
    }

    socket.on('state', onState)
    socket.on('errorToast', onErrorToast)
    socket.on('connect', onConnect)
    if (socket.connected) onConnect()

    return () => {
      socket.off('state', onState)
      socket.off('errorToast', onErrorToast)
      socket.off('connect', onConnect)
    }
  }, [])

  const createRoom = useCallback((playerName: string) => {
    return new Promise<void>((resolve, reject) => {
      socket.emit('createRoom', { playerName }, (res) => {
        if (res.ok) {
          const session = { roomCode: res.roomCode, sessionToken: res.sessionToken }
          saveSession(session)
          sessionRef.current = session
          resolve()
        } else {
          setErrorMessage(res.error)
          reject(new Error(res.error))
        }
      })
    })
  }, [])

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    return new Promise<void>((resolve, reject) => {
      socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName }, (res) => {
        if (res.ok) {
          const session = { roomCode: roomCode.toUpperCase(), sessionToken: res.sessionToken }
          saveSession(session)
          sessionRef.current = session
          resolve()
        } else {
          setErrorMessage(res.error)
          reject(new Error(res.error))
        }
      })
    })
  }, [])

  const leaveRoom = useCallback(() => {
    clearSession()
    sessionRef.current = null
    setState(null)
    socket.disconnect()
    socket.connect()
  }, [])

  function withRoomCode<T extends object>(payload: T) {
    return { ...payload, roomCode: sessionRef.current?.roomCode ?? state?.roomCode ?? '' }
  }

  const startGame = useCallback(() => {
    socket.emit('startGame', withRoomCode({}), (res) => {
      if (!res.ok) setErrorMessage(res.error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.roomCode])

  const kickPlayer = useCallback(
    (playerId: string) => {
      socket.emit('kickPlayer', withRoomCode({ playerId }), (res) => {
        if (!res.ok) setErrorMessage(res.error)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.roomCode]
  )

  const submitBid = useCallback(
    (bid: Bid) => {
      socket.emit('submitBid', withRoomCode({ bid }), (res) => {
        if (!res.ok) setErrorMessage(res.error)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.roomCode]
  )

  const submitPeek = useCallback(
    (choice: PeekChoice) => {
      socket.emit('submitPeek', withRoomCode({ choice }), (res) => {
        if (!res.ok) setErrorMessage(res.error)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.roomCode]
  )

  const playCard = useCallback(
    (card: Card) => {
      socket.emit('playCard', withRoomCode({ card }), (res) => {
        if (!res.ok) setErrorMessage(res.error)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.roomCode]
  )

  const playHiddenCard = useCallback(() => {
    socket.emit('playHiddenCard', withRoomCode({}), (res) => {
      if (!res.ok) setErrorMessage(res.error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.roomCode])

  const continueAfterRound = useCallback(() => {
    socket.emit('continueAfterRound', withRoomCode({}), (res) => {
      if (!res.ok) setErrorMessage(res.error)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.roomCode])

  return {
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
  }
}
