import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { EngineError } from '@foaica/engine';
import { RoomManager } from './roomManager.js';
const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN },
});
const roomManager = new RoomManager();
// socket.id -> {roomCode, playerId}, pentru a ști cine sunt la deconectare
const socketOwners = new Map();
function log(event, meta = {}) {
    // Nu logăm niciodată mâinile private ale jucătorilor sau alegerile secrete ale rundei 14.
    console.log(`[foaica] ${event}`, meta);
}
function broadcastState(roomCode) {
    const room = roomManager.getRoom(roomCode);
    if (!room)
        return;
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (!sockets)
        return;
    for (const socketId of sockets) {
        const owner = socketOwners.get(socketId);
        if (!owner || owner.roomCode !== roomCode)
            continue;
        const socket = io.sockets.sockets.get(socketId);
        if (!socket)
            continue;
        socket.emit('state', room.toClientState(owner.playerId));
    }
}
function sendErrorToSocket(socket, message) {
    socket.emit('errorToast', message);
}
/** Programează avansul automat după afișarea câștigătorului unei mâini. */
function scheduleTrickAdvance(roomCode) {
    setTimeout(() => {
        const room = roomManager.getRoom(roomCode);
        if (!room || room.phase !== 'TRICK_RESULT')
            return;
        try {
            room.advanceAfterTrick();
            broadcastState(roomCode);
        }
        catch (err) {
            log('advanceAfterTrick failed', { roomCode, error: String(err) });
        }
    }, 1600);
}
io.on('connection', (socket) => {
    log('socket connected', { socketId: socket.id });
    socket.on('createRoom', ({ playerName }, cb) => {
        try {
            const { room, hostPlayerId, sessionToken, roomCode } = roomManager.createRoom(playerName);
            socket.join(roomCode);
            socketOwners.set(socket.id, { roomCode, playerId: hostPlayerId });
            log('room created', { roomCode, hostPlayerId });
            cb({ ok: true, roomCode, sessionToken });
            broadcastState(roomCode);
        }
        catch (err) {
            cb({ ok: false, error: err.message });
        }
    });
    socket.on('joinRoom', ({ roomCode, playerName }, cb) => {
        try {
            const { room, playerId, sessionToken } = roomManager.joinRoom(roomCode, playerName);
            socket.join(room.code);
            socketOwners.set(socket.id, { roomCode: room.code, playerId });
            log('player joined', { roomCode: room.code, playerId });
            cb({ ok: true, sessionToken });
            broadcastState(room.code);
        }
        catch (err) {
            cb({ ok: false, error: err.message });
        }
    });
    socket.on('rejoinRoom', ({ roomCode, sessionToken }, cb) => {
        try {
            const resolved = roomManager.resolveSession(sessionToken);
            if (!resolved || resolved.room.code !== roomCode.toUpperCase()) {
                cb({ ok: false, error: 'Sesiune invalidă sau camera nu mai există' });
                return;
            }
            resolved.room.reconnect(resolved.playerId);
            socket.join(resolved.room.code);
            socketOwners.set(socket.id, { roomCode: resolved.room.code, playerId: resolved.playerId });
            log('player reconnected', { roomCode: resolved.room.code, playerId: resolved.playerId });
            cb({ ok: true });
            broadcastState(resolved.room.code);
        }
        catch (err) {
            cb({ ok: false, error: err.message });
        }
    });
    socket.on('startGame', ({ roomCode }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.startGame(playerId);
            log('game started', { roomCode });
        });
    });
    socket.on('kickPlayer', ({ roomCode, playerId: targetId }, cb) => {
        guarded(socket, roomCode, cb, (room, requesterId) => {
            room.kickPlayer(requesterId, targetId);
        });
    });
    socket.on('submitBid', ({ roomCode, bid }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.submitBid(playerId, bid);
            log('bid submitted', { roomCode, round: room.round });
        });
    });
    socket.on('submitPeek', ({ roomCode, choice }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.submitPeek(playerId, choice);
            log('round14 peek submitted', { roomCode }); // alegerea în sine NU e logată
        });
    });
    socket.on('playCard', ({ roomCode, card }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.playCard(playerId, card);
            log('card played', { roomCode, round: room.round });
            if (room.phase === 'TRICK_RESULT')
                scheduleTrickAdvance(roomCode);
        });
    });
    socket.on('playHiddenCard', ({ roomCode }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.playHiddenCard(playerId);
            log('hidden card played (round 14, blind)', { roomCode }); // valoarea NU e logată
            if (room.phase === 'TRICK_RESULT')
                scheduleTrickAdvance(roomCode);
        });
    });
    socket.on('continueAfterTrick', ({ roomCode }, cb) => {
        // Rezervat pentru control manual viitor; avansul e automat (vezi scheduleTrickAdvance).
        guarded(socket, roomCode, cb, () => { });
    });
    socket.on('continueAfterRound', ({ roomCode }, cb) => {
        guarded(socket, roomCode, cb, (room, playerId) => {
            room.continueAfterRound(playerId);
            log('round advanced', { roomCode, round: room.round });
        });
    });
    socket.on('disconnect', () => {
        const owner = socketOwners.get(socket.id);
        socketOwners.delete(socket.id);
        if (!owner)
            return;
        const room = roomManager.getRoom(owner.roomCode);
        if (!room)
            return;
        room.markDisconnected(owner.playerId);
        log('player disconnected', { roomCode: owner.roomCode, playerId: owner.playerId });
        broadcastState(owner.roomCode);
    });
    /** Helper: rezolvă camera/jucătorul pentru socket-ul curent, rulează acțiunea, trimite răspuns + rebroadcast. */
    function guarded(s, roomCode, cb, action) {
        try {
            const owner = socketOwners.get(s.id);
            if (!owner || owner.roomCode !== roomCode) {
                cb({ ok: false, error: 'Nu ești conectat la această cameră' });
                return;
            }
            const room = roomManager.getRoom(roomCode);
            if (!room) {
                cb({ ok: false, error: 'Camera nu mai există' });
                return;
            }
            action(room, owner.playerId);
            roomManager.touch(roomCode);
            cb({ ok: true });
            broadcastState(roomCode);
        }
        catch (err) {
            const message = err instanceof EngineError ? err.message : 'Eroare neașteptată';
            cb({ ok: false, error: message });
            sendErrorToSocket(s, message);
        }
    }
});
setInterval(() => roomManager.cleanupStaleRooms(), 1000 * 60 * 30);
httpServer.listen(PORT, () => {
    log('server listening', { port: PORT });
});
