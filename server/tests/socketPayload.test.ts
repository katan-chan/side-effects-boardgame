import { describe, expect, it } from 'vitest'
import {
  parseDecisionPayload,
  parseGameCommandPayload,
  parseRoomCreatePayload,
  parseRoomJoinPayload,
  parseSessionPayload,
} from '../socket/registerSocketHandlers'

describe('socket payload validation', () => {
  it('accepts only the command identifiers required by the authoritative engine', () => {
    expect(
      parseGameCommandPayload({
        type: 'playEpisode',
        episodeCardId: 'episode-01',
        targetPlayerId: 'ben-id',
        targetDisorderCardId: 'anxiety-01',
        options: { chosenCardId: 'forged-card-id' },
      }),
    ).toEqual({
      type: 'playEpisode',
      episodeCardId: 'episode-01',
      targetPlayerId: 'ben-id',
      targetDisorderCardId: 'anxiety-01',
    })
  })

  it('rejects malformed room, session, command, and decision payloads safely', () => {
    expect(() => parseRoomCreatePayload(null)).toThrow('Invalid request payload')
    expect(() => parseRoomJoinPayload({ roomId: 'ROOM' })).toThrow(
      'Invalid displayName',
    )
    expect(() => parseSessionPayload({ roomId: '', playerId: 'ada-id' })).toThrow(
      'Invalid roomId',
    )
    expect(() => parseGameCommandPayload({ type: 'unknown' })).toThrow(
      'Unknown game command',
    )
    expect(() => parseGameCommandPayload({ type: 'discard' })).toThrow(
      'Invalid cardInstanceId',
    )
    expect(() =>
      parseDecisionPayload({
        decisionId: 'decision-1',
        choiceIds: ['one', 'two', 'three', 'four'],
      }),
    ).toThrow('Invalid pending card choices')
  })

  it('keeps valid pending decision identifiers opaque and bounded', () => {
    expect(
      parseDecisionPayload({
        decisionId: 'decision-1',
        choiceIds: ['choice-1', 'choice-2', 'choice-3'],
      }),
    ).toEqual({
      decisionId: 'decision-1',
      choiceIds: ['choice-1', 'choice-2', 'choice-3'],
    })
  })

  it('requires a bounded bearer credential to resume a session', () => {
    expect(() =>
      parseSessionPayload({ roomId: 'ROOM01', playerId: 'ada-id' }),
    ).toThrow('Invalid sessionToken')
    expect(
      parseSessionPayload({
        roomId: 'ROOM01',
        playerId: 'ada-id',
        sessionToken: 'credential-value',
      }),
    ).toEqual({
      roomId: 'ROOM01',
      playerId: 'ada-id',
      sessionToken: 'credential-value',
    })
  })
})
