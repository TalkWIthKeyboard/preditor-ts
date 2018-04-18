export interface UserInfo {
  source: string
  password: string
  username: string | null
  email: string | null
  name: string | null
  birthday: string | null
  mobile: string | null
  number: number | null
}

export interface NoUserInfo {
  password: string
  number: number
  source: string
}