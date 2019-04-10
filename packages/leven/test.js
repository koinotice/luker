const FlexContract = require('flex-contract')

const Web3 = require('web3')
const contractJson = require('../build/contracts/HashDice')

const bip39 = require('bip39')
const ethJSWallet = require('ethereumjs-wallet')
const hdkey = require('ethereumjs-wallet/hdkey')
// const ERC20_ABI = require('./token/erc20.abi.json');
// const ERC20_ABI = require('./token/erc20.abi.json');
const ERC20Token = require("../build/contracts/PeloponnesianToken.json")

const cw3p = require('./create-web3-provider');

const socketProvider = cw3p({ws: true, network: "rinkeby",});

const erc20 = new FlexContract(ERC20Token.abi,"0x2D91FCEF402bd0e61661006Bee9EF0e53ce10EDf",{
  provider: socketProvider
})
async function main () {
  let c=await erc20.approve("0x49719d27c791040f9188959f98c1bf483AFb20b9",100,{key:"0xc4bd25016067dcbbc3eb5a233eccc091fc032f119c5e376d069a348458d9cd51"})

  console.log(c)
}
main()
