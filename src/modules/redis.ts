import * as Redis from 'ioredis'

const rdc = new Redis({
  port: 6379,
  host: 'localhost',
})

export default rdc
