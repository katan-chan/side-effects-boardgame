import { createGameServer } from './app'
import { getServerConfig } from './config'

const config = getServerConfig()
const { httpServer } = createGameServer(config)
const { port } = config
httpServer.listen(port, () =>
  console.log(`Side Effects server listening on :${port}`),
)
