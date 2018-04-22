import * as _ from 'lodash'
import * as Promise from 'bluebird'

import redisClient from '../modules/redis'
import query from '../modules/mysql'
import models from '../models'
import Parser from '../models/parser'
import { UserInfo, NoUserInfo } from '../interface'
import * as debug from './debugService'

const mysqlDBSchema = {
  t12306: ['password', 'email', 'name', 'CtfID', 'mobile', 'username'],
  '7k7k': ['password', 'username'],
  duduniu: ['password', 'username', 'email'],
  phpbb: ['password', 'numcount'],
  rock: ['password', 'numcount'],
  tianya: ['password', 'email', 'username']
}

const sqlCases = {
  count: 'SELECT COUNT(*) FROM {table}',
  itr_all: 'SELECT {query_schema} FROM {table} ' +
              'WHERE id >= (SELECT id FROM {table} ORDER BY id LIMIT {start}, 1) ' +
              'ORDER BY id LIMIT 10000',
}

let repetitionSet = new Set()

function _dataPaser(
  sqlResultList, 
  table: string,
) {
  let rubbishCount = 0
  let repetitionCount = 0
  return {
    mongoData: _.compact(_.map(sqlResultList, rowData => {
      // 做非法检查
      if (
        !Parser.passwordCheck(rowData.password) 
        || rowData.password.length < 3 
        || rowData.password.length > 30
      ) {
        if (repetitionSet.has(_.values(rowData).join(','))) {
          repetitionCount += 1
        } else {
          repetitionSet.add(_.values(rowData).join(','))
          rubbishCount += 1
        }
        return null
      }
      repetitionSet.add(_.values(rowData).join(','))
      // 合法数据的构造工厂
      switch (table) {
        case 't12306':
          return Parser.t12306(rowData)
        case '7k7k':
          return Parser.t7k7k(rowData)
        case 'duduniu':
          return Parser.duduniu(rowData)
        case 'tianya':
          return Parser.tianya(rowData)
        case 'phpbb':
        case 'rock':
          return Parser.phpbbAndRock(rowData, table)
        default:
          debug.error('CleanService-dataPaser ERROR: illegal table exists.')
          return null
      }
    })),
    rubbishCount,
    repetitionCount,
  }
}

/**
 * 清理数据
 * @param names 
 * @param model 
 */
export default async function clean(names: string[], model) {
  // 重新解析的策略：
    // 在mongoDB中持久化两张表：
    //   1. 用户用户信息的表
    //   2. 没有用户信息的表
  for (let index = 0; index < names.length; index += 1) {
    const table = names[index]
    const schemaList = mysqlDBSchema[table]
    // 防止错误的表名出现
    if (!schemaList) {
      continue
    }
    try {
      debug.finish(`${table} start!`)
      // 1. 拿出一共有多少条数据
      const countQuery = await query(sqlCases.count.replace('{table}', table))
      let count: number
      if (countQuery) {
        count = _.values(countQuery[0])[0]
        debug.info(`${table} has ${count} datas, start to query all data.`)
      } else {
        debug.error(`${table} has none datas, maybe we have some errors.`)
        break
      }
      // 2. 整理分批获取的sql数组，担心性能问题限制了每次sql的总量
      const sqlList: string[] = []
      for (let start = 0; start < count; start = start + 10000) {
        sqlList.push(sqlCases.itr_all
          .replace(/{table}/g, table)
          .replace('{query_schema}', schemaList.join(','))
          .replace('{start}', start.toString())
        )
      }
      // 3. 20个一组 <10000请求> 分批reduce顺序请求
      let reduceNumber = 0
      let rubbishTotal = 0
      let repetitionTotal = 0
      repetitionSet = new Set()      
      await Promise.mapSeries(
        // 尝试过并发数20，会在400w左右次请求的时候挂掉，这里不宜过高
        _.chunk(sqlList, 5), sqls => {
          return Promise.map(sqls, async sql => {
            const rowData = await query(sql)
            const result = _dataPaser(rowData, table)
            await model.insertMany(result.mongoData)
            reduceNumber += result.mongoData.length
            rubbishTotal += result.rubbishCount
            repetitionTotal += result.repetitionCount
            debug.info(`${table} finish ${reduceNumber}/${count} mongo save, repetition: ${result.repetitionCount}, rubbish: ${result.rubbishCount}`)
          })
        })
      // 4. 保存统计数据
      await models.Statistic.insertMany([
        { source: table, type: 'rubbish', count: rubbishTotal },
        { source: table, type: 'repetition', count: repetitionTotal }
      ])
      debug.finish(`${table} finished!`)
    } catch (err) {
      debug.error(`CleanService-clean ERROR: ${err}`)
    }
  }
}
