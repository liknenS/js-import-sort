'use strict';
const importSortFunc = require("./importSort");
const prefixes = [
  'constants/',
  'utils/',
  'services/',
  'api/',
  'redux-app/utils/',
  'redux-app/selectors/',
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
    return res || importSortFunc(a, b)
  }
};
