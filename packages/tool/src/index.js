const Leven = require('@pmker/leven');

const eachLimit = require('async/eachLimit');

const leven = new Leven({
  address: '',
  network: 'rinkeby',
  wallet: {
    mnemonic: 'donkey safe jacket common label rural baby sort project mandate response disease',
    address_index: 0,
    num_addresses: 32,
    options: {},
  },
});

const BN = require('bignumber.js');

function dec(balance) {
  return new BN(10)
    .pow(Number(18))
    .times(balance)
    .toString(10);
}
//const contractJson = require('@pmker/common/contracts/HashDice.json')

const  {tokensList} = require('@pmker/common/tokenList');
console.log(tokensList)

async function send() {
  //await leven.newContrat({key:leven.accounts[5]})

  const ABI = contractJson.abi;
  const BYTECODE = contractJson.bytecode;
  let contract = leven.hashWatch;
  let txid;

  console.log(333);
  const tx = contract.new({ key: leven.accounts[0], bytecode: BYTECODE });

  //  txid =await tx.txId
  // console.log(txid)
  receipt = await tx.confirmed(0);
  console.log(receipt);

  await contract.SetRoundWait(0, { key: leven.accounts[0] });
  const wait = await contract.GetRoundWait();
  console.log(wait);
}

//send()

process.on('unhandledRejection', (reason, p) => {
  //console.log('Unhandled Rejection at:', p)
  // application specific logging, throwing an error, or other logic here
});
//
// init()
