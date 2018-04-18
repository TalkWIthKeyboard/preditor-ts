import * as fs from 'fs'
import * as moment from 'moment'
import * as path from 'path'

function _debug(
  message: string, 
  type: 'ERROR' | 'INFO' | 'FINISH'
) {
  const debugeMessage = `[${moment().format('YYYY-MM-DD HH:mm:ss')}] [${type}] ${message} \n`
  const fd = fs.openSync(path.join(__dirname, '..', '..', '..', 'log', `${type}.output`), 'a')
  fs.writeFileSync(fd, debugeMessage, { flag: 'a+' })
  console.log(debugeMessage)
}

export function error(message) {
  _debug(message, 'ERROR')
}

export function info(message) {
  _debug(message, 'INFO')
}

export function finish(message) {
  _debug(message, 'FINISH')
}