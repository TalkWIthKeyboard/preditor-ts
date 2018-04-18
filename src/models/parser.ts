import { UserInfo, NoUserInfo } from '../interface'

export default class Parser {
  static mailCheck(mail: string) {
    return /^[0-9a-zA-Z_,]*@[0-9a-zA-Z]*.[0-9a-zA-Z]*$/.test(mail)
  }

  static passwordCheck(password: string) {
    return /^[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~0-9a-zA-Z]*$/.test(password)
  }

  static usernameCheck(username: string) {
    return !/.*\?{3}.*/.test(username)
  }

  static t12306 (queryData): UserInfo {
    const result: any = {}
    // 身份证号码（长度检查）
    const cfid: string | null = 
      queryData.CtfID.length === 15 || queryData.CtfID.length === 18 
        ? queryData.CtfID 
        : null
    // 密码不做检查
    result.password = queryData.password
    // 邮箱（正则检查）
    result.email = this.mailCheck(queryData.email) ? queryData.email : null
    // 名字（取除掉特殊符号，保留空格）
    // 可能出现 少量英文名，少量中英混合
    result.name = queryData.username.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '')
    // 生日（通过身份证信息生成）
    if (cfid) {
      result.birthday = cfid.length === 18 ? cfid.slice(6, 14) : `19${cfid.slice(6, 12)}`
    } else {
      result.birthday === null
    }
    // 电话号码
    result.mobile = queryData.mobile.length === 11 ? queryData.mobile : null
    // username
    result.username = queryData.username
    result.source = 't12306'
    return result
  }

  static t7k7k(queryData): UserInfo {
    const result: any = {}
    result.password = queryData.password
    result.email = this.mailCheck(queryData.email) ? queryData.email : null
    result.source = '7k7k'
    return result
  }

  static duduniu(queryData): UserInfo {
    const result: any = {}
    result.password = queryData.password
    result.name = queryData.username
    const email = queryData.email.replace(/["[]]/g, '')
    result.email = this.mailCheck(email) ? email : null
    return result
  }

  static tianya(queryData): UserInfo {
    const result: any = {}
    result.password = queryData.password
    result.email = this.mailCheck(queryData.email) ? queryData.email : null
    result.name = this.usernameCheck(queryData.username) ? queryData.username : null
    result.source = 'tianya'
    return result
  }

  static phpbbAndRock(queryData, table: string): UserInfo {
    const result: any = {}
    result.password = queryData.password
    result.numcount = queryData.numcount
    result.source = table
    return result
  }
}