import { afterEach, describe, expect, it } from 'vitest'
import { createGameServer } from '../app'
import { getServerConfig } from '../config'

describe('production server configuration', () => {
  const runningServers: ReturnType<typeof createGameServer>[] = []

  afterEach(async () => {
    await Promise.all(
      runningServers.splice(0).map(
        ({ httpServer, io }) =>
          new Promise<void>((resolve) => {
            io.close()
            httpServer.close(() => resolve())
          }),
      ),
    )
  })

  it('uses safe development defaults and parses explicit origins', () => {
    expect(getServerConfig({})).toEqual({
      port: 3001,
      clientOrigins: ['http://localhost:5173'],
    })
    expect(
      getServerConfig({
        PORT: '4100',
        CLIENT_ORIGIN: 'https://play.example.test, https://admin.example.test',
      }),
    ).toEqual({
      port: 4100,
      clientOrigins: [
        'https://play.example.test',
        'https://admin.example.test',
      ],
    })
    expect(() => getServerConfig({ PORT: 'invalid' })).toThrow('PORT')
  })

  it('serves a non-sensitive health response', async () => {
    const server = createGameServer({
      port: 0,
      clientOrigins: ['http://localhost:5173'],
    })
    runningServers.push(server)
    await new Promise<void>((resolve) =>
      server.httpServer.listen(0, '127.0.0.1', resolve),
    )
    const address = server.httpServer.address()
    if (!address || typeof address === 'string') throw new Error('No port')

    const response = await fetch(`http://127.0.0.1:${address.port}/health`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
