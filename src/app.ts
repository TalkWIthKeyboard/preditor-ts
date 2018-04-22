import clean from './services/cleanService'
import mongo from './models'
import * as debug from './services/debugService'

const userInfoTableName = ['t12306', '7k7k', 'duduniu', 'tianya']
const noUserInfoTableName = ['phpbb', 'rock']

async function main() {
  debug.finish('Task start!')
  await clean(userInfoTableName, mongo.UserInfoPassword)
}

main().then(() => {
  debug.finish('Task end!')
  process.exit(0)
})
