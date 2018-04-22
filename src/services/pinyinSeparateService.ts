import * as _ from 'lodash'

const sm = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'w', 'x', 'y', 'z', 'sh', 'zh', 'ch']
const ymTransform = {
  a: {
    i: null, 
    o: null, 
    n: { g: null }
  }, 
  e: {
    i: null, 
    r: null, 
    n: { g: null }
  }, 
  i: {
    e: null, 
    a: { n: { g: null }, o: null }, 
    u: null, 
    o: { n: { g: null } }, 
    n: { g: null }
  },
  o: { 
    u: null, 
    n: { g: null }
  },
  u: {
    a: { i: null, n: { g: null }}, 
    e: null, 
    i: null, 
    o: null
  }
}

const smTransform = {
  a: {
    i: null, 
    o: null, 
    n: { g: null }
  },
  e: {
    i: null, 
    r: null, 
    n: { g: null }
  },
  o: {
    u: null
  }
}

const allResult: string[][] = []

/**
 * 判断是否能以这个位置作为结束，开启下一段
 * @param pinyin 
 * @param index 
 */
function _checkNewBranch(
  pinyin: string,
  index: number,
) {
  //1. angan -> an,gan / ang,an
  if (
    sm.includes(pinyin[index]) 
    && sm.includes(pinyin[index + 1])
    && _.keys(ymTransform).includes(pinyin[index + 2])
  ) {
    return true
  }
  //2. renen -> re,nen / ren,en
  if (
    _.keys(ymTransform).includes(pinyin[index])
    && pinyin[index] !== 'o'
    // niana -> nia,na (illegal)
    && (pinyin[index - 1] !== 'i' 
      || (pinyin[index - 1] === 'i' && pinyin[index] !== 'a'))
    && sm.includes(pinyin[index + 1])
    && _.keys(ymTransform).includes(pinyin[index + 2]) 
  ) {
    return true
  }
  //3. nian -> ni,an / nian
  //   niang -> ni,ang / niang
  if (
    _.keys(ymTransform).includes(pinyin[index])
    && (pinyin[index] === 'i' || pinyin[index] === 'u')
    && _.keys(smTransform).includes(pinyin[index + 1])
    && _.keys(smTransform[pinyin[index + 1]]).includes(pinyin[index + 2])
  ) {
    return true
  }
  return false
}

function _separateSearch(
  pinyin: string, 
  index: number,
  result: string[],
  resultNum: number,
  finish: boolean,
  serious: boolean,
) {
  let newResult: string[] = _.map(result, r => r)
  let newResultNum: number = resultNum
  let _index: number = index

  if (index === pinyin.length) {
    if (serious ? finish : true) {
      const copyResult = _.map(result, r => r)
      allResult.push(copyResult)
    }
    return
  }
  const char = pinyin[index]
  const next = pinyin[index + 1]
  if (['s', 'z', 'c'].includes(char) && next === 'h') {
    newResultNum += 1
    newResult[newResultNum] = char + next
    _index += 2
    _separateSearch(pinyin, _index, newResult, newResultNum, false, serious)
  } else if (sm.includes(char)) {
    newResultNum += 1
    newResult[newResultNum] = char
    _index += 1
    _separateSearch(pinyin, _index, newResult, newResultNum, false, serious)
  } else {
    const transform = finish ? smTransform : ymTransform
    if (_.keys(transform).includes(char)) {
      let _nextObj = transform[char]
      let smString: string = ''
      
      while (_index < pinyin.length) {
        smString += pinyin[_index]        
        // 向后循环的时候检查是否结束        
        if (_nextObj && _.keys(_nextObj).includes(pinyin[_index + 1])) {
          // 这里可能出现多种情况分支
          if (_checkNewBranch(pinyin, _index)) {
            if (finish) {
              newResultNum += 1
              newResult[newResultNum] = smString
              _separateSearch(pinyin, _index + 1, newResult, newResultNum, true, serious) 
              newResultNum -= 1                       
            } else {
              let row = newResult[newResultNum]
              newResult[newResultNum] += smString
              _separateSearch(pinyin, _index + 1, newResult, newResultNum, true, serious)
              newResult[newResultNum] = row
            }
          }
          _index += 1
          _nextObj = _nextObj[pinyin[_index]]
        } else {
          if (finish) {
            newResultNum += 1
            newResult[newResultNum] = smString
          } else {
            newResult[newResultNum] += smString
          }
          _separateSearch(pinyin, _index + 1, newResult, newResultNum, true, serious)
          break
        }
      }
    }
  }
}

export default function getAllSeparateResult(pinyin): string[][] {
  _separateSearch(pinyin, 0, [], -1 , true, true)
  return allResult
}
