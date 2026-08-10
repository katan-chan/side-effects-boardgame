import { playDisorder } from '../../src/game/engine/disorderPlay'
import { playDrug } from '../../src/game/engine/drugTreatment'
import { playEpisode } from '../../src/game/engine/episode'
import { createGame } from '../../src/game/engine/setup'
import { playTherapy } from '../../src/game/engine/therapy'
import { discardCard, drawForTurn, endTurn } from '../../src/game/engine/turns'
import type { GameState } from '../../src/game/engine/types'
import type { GameCommand } from '../game/commands'
import type { Room, RoomPlayer } from './types'

export class RoomService {
  private readonly rooms = new Map<string, Room>()

  createRoom(
    displayName: string,
    playerId = this.createPlayerId(),
    socketId?: string,
  ): { room: Room; player: RoomPlayer } {
    const player = this.createPlayer(displayName, playerId, socketId)
    const room: Room = {
      id: this.createRoomCode(),
      hostPlayerId: player.id,
      players: [player],
      status: 'lobby',
    }
    this.rooms.set(room.id, room)
    return { room, player }
  }

  joinRoom(
    roomId: string,
    playerId: string,
    displayName: string,
    socketId?: string,
  ): Room {
    const room = this.requireRoom(roomId)
    if (room.status !== 'lobby')
      throw new Error('Cannot join a room after the game has started.')
    this.validateDisplayName(displayName)
    if (room.players.length >= 8) throw new Error('This room is full.')
    if (room.players.some((player) => player.id === playerId))
      throw new Error('This player is already in the room.')
    if (
      room.players.some((player) => player.displayName === displayName.trim())
    )
      throw new Error('Display names must be unique in a room.')

    room.players.push({
      id: playerId,
      displayName: displayName.trim(),
      connected: true,
      socketId,
    })
    return room
  }

  leaveRoom(roomId: string, playerId: string): Room | undefined {
    const room = this.requireRoom(roomId)
    if (room.status !== 'lobby')
      throw new Error('Leaving an active game is not supported yet.')
    const remainingPlayers = room.players.filter(
      (player) => player.id !== playerId,
    )
    if (remainingPlayers.length === room.players.length)
      throw new Error('Player is not in this room.')
    if (remainingPlayers.length === 0) {
      this.rooms.delete(roomId)
      return undefined
    }
    room.players = remainingPlayers
    if (room.hostPlayerId === playerId)
      room.hostPlayerId = remainingPlayers[0].id
    return room
  }

  startRoom(roomId: string, playerId: string): Room {
    const room = this.requireRoom(roomId)
    if (room.hostPlayerId !== playerId)
      throw new Error('Only the host can start the game.')
    if (room.status !== 'lobby')
      throw new Error('This room has already started.')
    if (room.players.length < 2)
      throw new Error('At least two players are required to start.')
    if (room.players.some((player) => !player.connected))
      throw new Error('All players must be connected before starting.')

    room.gameState = createGame(
      room.players.map((player) => player.displayName),
      { playerIds: room.players.map((player) => player.id) },
    )
    room.status = 'playing'
    return room
  }

  executeCommand(
    roomId: string,
    playerId: string,
    command: GameCommand,
  ): GameState {
    const room = this.requireRoom(roomId)
    if (!room.gameState || room.status !== 'playing')
      throw new Error('This room does not have an active game.')
    const roomPlayer = room.players.find((player) => player.id === playerId)
    if (!roomPlayer) throw new Error('Player is not in this room.')
    if (!roomPlayer.connected)
      throw new Error('Disconnected players cannot send gameplay commands.')

    const game = room.gameState
    const nextGame = this.applyCommand(game, playerId, command)
    room.gameState = nextGame
    if (nextGame.status === 'finished') room.status = 'finished'
    return nextGame
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  resumeSession(roomId: string, playerId: string, socketId: string): Room {
    const room = this.requireRoom(roomId)
    const player = room.players.find((candidate) => candidate.id === playerId)
    if (!player) throw new Error('Player is not in this room.')
    player.connected = true
    player.socketId = socketId
    return room
  }

  markDisconnected(roomId: string, playerId: string): Room {
    const room = this.requireRoom(roomId)
    const player = room.players.find((candidate) => candidate.id === playerId)
    if (!player) throw new Error('Player is not in this room.')
    player.connected = false
    player.socketId = undefined
    return room
  }

  private createPlayer(
    displayName: string,
    playerId: string,
    socketId?: string,
  ): RoomPlayer {
    this.validateDisplayName(displayName)
    return {
      id: playerId,
      displayName: displayName.trim(),
      connected: true,
      socketId,
    }
  }

  private createPlayerId(): string {
    return `player-${Math.random().toString(36).slice(2, 12)}`
  }

  private createRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const generateCode = () =>
      Array.from(
        { length: 6 },
        () => alphabet[Math.floor(Math.random() * alphabet.length)],
      ).join('')
    let code = generateCode()
    while (this.rooms.has(code)) code = generateCode()
    return code
  }

  private requireRoom(roomId: string): Room {
    const room = this.rooms.get(roomId)
    if (!room) throw new Error('Room not found.')
    return room
  }

  private validateDisplayName(displayName: string): void {
    if (!displayName.trim()) throw new Error('Display name is required.')
  }

  private applyCommand(
    game: GameState,
    playerId: string,
    command: GameCommand,
  ): GameState {
    switch (command.type) {
      case 'draw':
        return drawForTurn(game, playerId)
      case 'playDrug':
        return playDrug(
          game,
          playerId,
          command.drugCardId,
          command.disorderCardId,
        )
      case 'playDisorder':
        return playDisorder(
          game,
          playerId,
          command.disorderCardId,
          command.targetPlayerId,
        )
      case 'playEpisode':
        return playEpisode(
          game,
          playerId,
          command.episodeCardId,
          command.targetPlayerId,
          command.targetDisorderCardId,
          command.options,
        )
      case 'playTherapy':
        return playTherapy(
          game,
          playerId,
          command.therapyCardId,
          command.disorderCardId,
        )
      case 'discard':
        return discardCard(game, playerId, command.cardInstanceId)
      case 'endTurn':
        return endTurn(game, playerId)
    }
  }
}
