import { customAlphabet } from 'nanoid';
import { GameRoom } from '@foaica/engine';
// Alfabet fără caractere ambigue (0/O, 1/I) — coduri de cameră ușor de dictat.
const roomCodeAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);
const idAlphabet = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);
const sessionAlphabet = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 32);
export class RoomManager {
    rooms = new Map();
    sessions = new Map();
    lastActivity = new Map();
    createRoom(hostName) {
        let roomCode = roomCodeAlphabet();
        while (this.rooms.has(roomCode))
            roomCode = roomCodeAlphabet();
        const hostPlayerId = idAlphabet();
        const room = new GameRoom(roomCode, hostPlayerId, hostName.trim().slice(0, 24) || 'Host');
        this.rooms.set(roomCode, room);
        this.touch(roomCode);
        const sessionToken = sessionAlphabet();
        this.sessions.set(sessionToken, { roomCode, playerId: hostPlayerId });
        return { room, hostPlayerId, sessionToken, roomCode };
    }
    joinRoom(roomCode, playerName) {
        const room = this.rooms.get(roomCode.toUpperCase());
        if (!room)
            throw new Error('Camera nu există');
        const playerId = idAlphabet();
        room.addPlayer(playerId, playerName.trim().slice(0, 24) || 'Jucător');
        this.touch(room.code);
        const sessionToken = sessionAlphabet();
        this.sessions.set(sessionToken, { roomCode: room.code, playerId });
        return { room, playerId, sessionToken };
    }
    resolveSession(sessionToken) {
        const info = this.sessions.get(sessionToken);
        if (!info)
            return null;
        const room = this.rooms.get(info.roomCode);
        if (!room || !room.hasPlayer(info.playerId))
            return null;
        return { room, playerId: info.playerId };
    }
    getRoom(roomCode) {
        return this.rooms.get(roomCode.toUpperCase());
    }
    touch(roomCode) {
        this.lastActivity.set(roomCode, Date.now());
    }
    /** Curăță camerele complet deconectate de mai mult de `maxIdleMs`. */
    cleanupStaleRooms(maxIdleMs = 1000 * 60 * 60 * 6) {
        const now = Date.now();
        for (const [code, room] of this.rooms) {
            const last = this.lastActivity.get(code) ?? 0;
            if (room.everyoneDisconnected && now - last > maxIdleMs) {
                this.rooms.delete(code);
                this.lastActivity.delete(code);
                for (const [token, info] of this.sessions) {
                    if (info.roomCode === code)
                        this.sessions.delete(token);
                }
            }
        }
    }
}
