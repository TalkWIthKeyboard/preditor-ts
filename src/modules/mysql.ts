import * as mysql from 'mysql'

const connect = mysql.createConnection({
  host: '10.60.39.19',
  database: 'passworddata',
  user: 'root',
  password: 'mysql_pass'
})

connect.connect()

export default function (sql) {
  return new Promise((resolve, reject) => {
    connect.query(sql, (err, result) => {
      err ? reject(err) : resolve(result) 
    })
  })
}

