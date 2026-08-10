import type { PersistedRoomSnapshot, RoomRepository } from './types'

export interface SupabaseRoomRepositoryOptions {
  url: string
  secretKey: string
  fetch?: typeof fetch
}

/** Minimal PostgREST adapter; no Supabase credentials reach the client bundle. */
export class SupabaseRoomRepository implements RoomRepository {
  private readonly fetcher: typeof fetch

  constructor(private readonly options: SupabaseRoomRepositoryOptions) {
    this.fetcher = options.fetch ?? fetch
  }

  async save(snapshot: PersistedRoomSnapshot): Promise<void> {
    const updatedAt = new Date().toISOString()
    await this.request('rooms?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: snapshot.room.id,
        code: snapshot.room.id,
        host_player_id: snapshot.room.hostPlayerId,
        status: snapshot.room.status,
        updated_at: updatedAt,
      }),
    })
    await this.request('room_snapshots?on_conflict=room_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        room_id: snapshot.room.id,
        schema_version: snapshot.schemaVersion,
        state: snapshot,
        updated_at: updatedAt,
      }),
    })
  }

  async loadActive(): Promise<PersistedRoomSnapshot[]> {
    const response = await this.request('room_snapshots?select=state', {
      method: 'GET',
    })
    const rows = (await response.json()) as Array<{ state: PersistedRoomSnapshot }>
    return rows
      .map((row) => row.state)
      .filter((snapshot) => snapshot.room.status !== 'finished')
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetcher(
      `${this.options.url.replace(/\/$/, '')}/rest/v1/${path}`,
      {
        ...init,
        headers: {
          apikey: this.options.secretKey,
          Authorization: `Bearer ${this.options.secretKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      },
    )
    if (!response.ok)
      throw new Error(`Supabase room persistence failed (${response.status}).`)
    return response
  }
}
