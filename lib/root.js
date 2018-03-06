'use strict';

const prefixes = [
  'constants/',
  'utils/',
  'service/',
  'api/',
  'redux-app/utils/',
  'redux-app/selector/',
  'redux-app/actionCreators/',
  'redux-app/modules/',
  'hocs/',
  'elemenst/',
  'apps/'
]
const getI = s => prefixes.findIndex(p => s.startsWith(p))

module.exports = {
  check: (path) => getI(path) !== -1,
  sort: (a, b) => {
    const res = getI(a) - getI(b)
    console.log(a,b, res)
    return res
  }
};
