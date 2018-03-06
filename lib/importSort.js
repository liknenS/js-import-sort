'use strict';

const orderMain = [
  'constants/': 1,
  'utils/': 2,
  'service/': 3,
  'api/': 4,
  'redux-app/utils/': 5,
  'redux-app/selector/': 6,
  'redux-app/actionCreators/': 7,
  'redux-app/modules/': 8,
  '../': 9,
  './': 10,
}
const orderMainKeys = Object.keys(orderMain)


const getOrder = a => orderMainKeys.findIndex(p => a.startsWith(p))

module.exports = (a, b) => {
  const ta = getOrder(a)
  const tb = getOrder(b)
  if (ta === -1 && tb === -1) {
    return a.localeCompare(b);
  } else {
    return tb - ta
  }
};
