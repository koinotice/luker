const tokens = require('./token');

const tokensList = [];
tokens.forEach(token => {
  let coin = {
    value: token.address,
    label: token.symbol,
  };
  tokensList.push(coin);
});

export default tokensList;
