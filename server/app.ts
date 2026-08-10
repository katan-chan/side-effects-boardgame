import { createServer } from 'node:http'
import { Server } from 'socket.io'
import type { ServerConfig } from './config'
import { RoomService } from './rooms/roomService'
import { registerSocketHandlers } from './socket/registerSocketHandlers'

export function createGameServer(config: ServerConfig) {
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: 'Not found' }))
  })
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigins,
      methods: ['GET', 'POST'],
    },
  })
  registerSocketHandlers(io, new RoomService())
  return { httpServer, io }
}
