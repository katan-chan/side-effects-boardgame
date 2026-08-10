import type { Room } from '../rooms/types'

export const ROOM_SNAPSHOT_SCHEMA_VERSION = 1

export interface PersistedRoomSnapshot {
  schemaVersion: typeof ROOM_SNAPSHOT_SCHEMA_VERSION
  room: Omit<Room, 'players'> & {
    players: Array<Omit<Room['players'][number], 'socketId'>>
  }
}

export interface RoomRepository {
  save(snapshot: PersistedRoomSnapshot): Promise<void>
  loadActive(): Promise<PersistedRoomSnapshot[]>
}
