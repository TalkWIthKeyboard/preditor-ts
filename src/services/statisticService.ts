import mongo from '../models'
import * as _ from 'lodash'
import * as Promise from 'bluebird'
import redisClient from '../modules/redis'

const REDIS_STATISTIC_PWD_LENGTH_HM = 'predictor:statistic:length:hm'
const REDIS_STATISTIC_PWD_COUNT_HM = 'predictor:statistic:count:hm'
const REDIS_STATISTIC_PWD_INFO_KEY = 'predictor:statistic:info:key'
const REDIS_STATISTIC_PWD_INFO_COUNT_KEY = 'predictor:statistic:info:count:key'

/**
 * 将数据转存到redis中
 * （因为node对list等数据类型有大小的限制，需要redis当作中间存储）
 * @param redisKey 
 * @param hashMap 
 */
async function _transformDataToRedis(redisKey: string, hashMap) {
  await Promise.mapSeries(_.chunk(_.keys(hashMap), 1000), keys => {
    return Promise.map(keys, key => {
      return redisClient.hincrby(redisKey, key, hashMap[key])
    })
  })
}

/**
 * 包含用户信息的统计
 * @param pwd 
 * @param hashMap 
 */
async function _checkIncludeInfo(pwd, hashMap) {
  
}

/**
 * 对一个表进行数据统计
 * @param table mongo表
 * @param count 数据总量
 * @param haveUserInfo 是否含有用户信息
 */
async function _statisticData(
  table, 
  count: number, 
  haveUserInfo: boolean,
) {
  // 1. 统计密码长度分布
  const pwdLengthMap = {}
  // 2. 密码出现次数统计
  const pwdHashMap = {}
  // 3. 密码包含用户信息次数统计
  const includeUserInfoString = await redisClient.get(REDIS_STATISTIC_PWD_INFO_KEY)
  let includeUserInfoMap
  if (includeUserInfoString) {
    includeUserInfoMap = JSON.parse(includeUserInfoMap)
    _.each(_.keys(includeUserInfoMap), key => {
      includeUserInfoMap[key] = parseInt(includeUserInfoMap[key])
    })
  } else {
    includeUserInfoMap = {
      username: 0,
      email: 0,
      name: 0,
      birthday: 0,
      mobile: 0,
    }
  }
  // 4. 合法用户信息出现次数统计
  const infoCountString = await redisClient.get(REDIS_STATISTIC_PWD_INFO_COUNT_KEY)
  let infoCountMap
  if (infoCountString) {
    infoCountMap = JSON.parse(infoCountMap)
    _.each(_.keys(infoCountMap), key => {
      infoCountMap[key] = parseInt(infoCountMap[key])
    })
  } else {
    infoCountMap = {
      username: 0,
      email: 0,
      name: 0,
      birthday: 0,
      mobile: 0,
    }
  }
  
  const limit = 100000
  const requireList: number[] = []
  for (let index = 0; index < count; index += limit) {
    requireList.push(index)
  }
  await Promise.mapSeries(_.chunk(requireList, 5), async skipNumbers => {
    const pwds = _.flatten(await Promise.map(skipNumbers, skip => {
      return table.find({})
        .skip(skip)
        .limit(limit)
        .lean()
        .exec()
    }))
    if (haveUserInfo) {
      _.each(pwds, pwd => {
        pwdLengthMap[pwd.length] = pwdLengthMap[pwd.length] 
          ? pwdLengthMap[pwd.length] + 1
          : 0
        pwdHashMap[pwd] = pwdHashMap[pwd]
          ? pwdHashMap[pwd] + 1
          : 0
        _.each(_.keys(infoCountMap), key => {
          infoCountMap[key] += pwd[key] ? 1 : 0
        })
        _checkIncludeInfo(pwd, includeUserInfoString)
      })
    } else {
      _.each(pwds, pwd => {
        pwdLengthMap[pwd.length] = pwdLengthMap[pwd.length] 
          ? pwdLengthMap[pwd.length] + pwd.number
          : 0
        pwdHashMap[pwd] = pwdHashMap[pwd]
          ? pwdHashMap[pwd] + pwd.number
          : 0
      })
    }
    // 转存redis进行短暂的持久化
    await _transformDataToRedis(REDIS_STATISTIC_PWD_COUNT_HM, pwdHashMap)
    await _transformDataToRedis(REDIS_STATISTIC_PWD_LENGTH_HM, pwdLengthMap) 
  })
  await redisClient.set(REDIS_STATISTIC_PWD_INFO_KEY, JSON.stringify(includeUserInfoMap))
  await redisClient.set(REDIS_STATISTIC_PWD_INFO_COUNT_KEY, JSON.stringify(infoCountMap))
}


/**
 * 计算密码的长度分布情况
 */
export default async function passwordLengthDistribute() {
  const [userCount, noUserCount] = await Promise.all([
    mongo.UserInfoPassword.find({}).count().exec(),
    mongo.NoUserInfoPassword.find({}).count().exec()
  ])
  await _statisticData(mongo.UserInfoPassword, userCount, true)
  await _statisticData(mongo.NoUserInfoPassword, userCount, false)
}