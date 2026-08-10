import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { RoomService } from './rooms/roomService'
import { registerSocketHandlers } from './socket/registerSocketHandlers'

const port = Number(process.env.PORT ?? 3001)
const httpServer = createServer()
const io = new Server(httpServer, { cors: { origin: '*' } })
registerSocketHandlers(io, new RoomService())
httpServer.listen(port, () =>
  console.log(`Side Effects server listening on :${port}`),
)
