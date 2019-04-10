const FlexContract = require('flex-contract')
//const HDWalletProvider = require("truffle-hdwallet-provider")

const Web3 = require('web3')
const contractJson = require('../common/contracts/HashDice.json')

const bip39 = require('bip39')
const ethJSWallet = require('ethereumjs-wallet')
const hdkey = require('ethereumjs-wallet/hdkey')
// const ERC20_ABI = require('./token/erc20.abi.json');
// const ERC20_ABI = require('./token/erc20.abi.json');
const ERC20Token = require(__dirname + '/../common/contracts/GoToken.json')

const cw3p = require('./create-web3-provider')

class Leven {
  constructor({address, network, rpc, http, wallet}) {
    const that = this
    this.addresses = []
    this.wallets = []
    this.accounts = []
    const ABI = contractJson.abi
    const socketProvider = cw3p({ws: true, network: network,})

    //console.log(socketProvider)
    //this.httpProviderUrl = cw3p({ws: false, network: network,}).provider.host
    that.provider = socketProvider.host



    //const MyContract = new web3.eth.Contract(abi, address);
    if (address) {
      this.hashDice = new FlexContract(ABI, address, {
        providerURI: that.provider
      })

      this.hashWatch = this.hashDice.clone({
        providerURI: that.provider
        //providerURI:"https://rinkeby.infura.io/XyRNUV3vyFAmldVaRIjO"
      })

      this.hashEvent = new this.hashWatch.web3.eth.Contract(ABI,address)
      this.contractAddress = address
    } else {
      this.hashDice = new FlexContract(ABI, {
        providerURI: that.provider
      })

      this.hashWatch = this.hashDice.clone({
        providerURI: that.provider
        //providerURI:"https://rinkeby.infura.io/XyRNUV3vyFAmldVaRIjO"
      })
    }
    this.token = new FlexContract(ERC20Token.abi, {
      providerURI: that.provider
    })
    this.web3 = this.hashDice.web3
    this.eth = this.hashDice.eth
    //this.eth.setChainId(11235)
    this.wallet = wallet
    this.start()
    // this.users=this.web3.eth.getAccounts()

  }

  async start() {
    await this.HDWallet(this.wallet)
  }


//     async init(){
//         const wallet = this.wallet
//         const provider = new HDWalletProvider(wallet.mnemonic, this.httpProviderUrl, wallet.address_index, wallet.num_addresses)
//         const HashDice = Contract(contractJson);
// //TestToken.setProvider(web3.currentProvider);
//         HashDice.setProvider(provider);
//
//         this.HashContract = await HashDice.at(this.contractAddress)
//
//         this.web3 = new Web3(provider);
//         this.users = await this.web3.eth.getAccounts()
//     }
//     async start() {
//         const wallet = this.wallet
//         const provider = new HDWalletProvider(wallet.mnemonic, this.httpProviderUrl, wallet.address_index, wallet.num_addresses)
//
//         this.web3 = new Web3(provider);
//         this.users = await this.web3.eth.getAccounts()
//
//
//     }

  async newContrat({key}) {

    const ABI = contractJson.abi
    const BYTECODE = contractJson.bytecode
    let contract = this.hashWatch
    let txid, receipt

    const tx = contract.new({key: key, bytecode: BYTECODE, gas: 6000000})


    receipt = await tx.confirmed(3)
    console.log(receipt)

    await contract.SetRoundWait(0, {key: key});
    const wait = await contract.GetRoundWait();
    console.log(wait)

    return {receipt, contract}

  }

  async newToken(name, symbol, decimals, {abi, bytecode, key}) {

    const contract = new FlexContract(abi, {
      provider: this.provider
    })

    const tx = contract.new(name, symbol, decimals, {key: key, bytecode: bytecode})
// Wait for the transaction hash.
    let txid = await tx.txId

    console.log(txid)
    let receipt = await tx.receipt
// Wait for the receipt, you can also just wait on the `tx` object itself.
    // let receipt = await tx.confirmed(3);
// Wait for the receipt after 3 confirmations.
    // await tx.confirmed(3);
    //console.log(txid,receipt)
    return {receipt, contract}
  }

  get HashDice() {
    return this.hashDice
  }

  async newBlock(callback) {
    //console.log(this.hashDice.web3.eth)
    this.hashWatch.web3.eth.subscribe('newBlockHeaders', function (error, result) {
      if (!error) {
        return
      }
      console.error(error)
    }).on('data', async function (blockHeader) {
      let data = {
        number: blockHeader.number,
        hash: blockHeader.hash,
        gasLimit: blockHeader.gasLimit,
        parentHash: blockHeader.parentHash
      }
      callback(data)

    }).on('error', error => {
      console.log(error)
    })
  }

  async HDWallet({
                   mnemonic,
                   address_index,
                   num_addresses,
                   options
                 }) {

    let wallet_hdpath = typeof options.wallet_hdpath != 'undefined' ? options.wallet_hdpath : 'm/44\'/60\'/0\'/0/'

    if ((mnemonic && mnemonic.indexOf(' ') === -1) || Array.isArray(mnemonic)) {
      const privateKeys = Array.isArray(mnemonic) ? mnemonic : [mnemonic]
      this.wallets = {}
      this.addresses = []
      this.accounts = []

      for (let i = address_index; i < address_index + num_addresses; i++) {
        const privateKey = Buffer.from(privateKeys[i].replace('0x', ''), 'hex')
        if (ethUtil.isValidPrivate(privateKey)) {
          const wallet = ethJSWallet.fromPrivateKey(privateKey)
          const address = wallet.getAddressString()
          this.addresses.push(address)
          this.wallets[address] = wallet
          this.accounts.push('0x' + wallet.getPrivateKey().toString('hex'))
        }
      }
    } else {
      const cc = await bip39.mnemonicToSeed(mnemonic)

      this.hdwallet = hdkey.fromMasterSeed(cc)
      this.wallet_hdpath = wallet_hdpath
      this.wallets = {}
      this.addresses = []
      this.accounts = []

      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Mnemonic invalid or undefined')
      }

      for (let i = address_index; i < address_index + num_addresses; i++) {
        const wallet = this.hdwallet
          .derivePath(this.wallet_hdpath + i)
          .getWallet()
        const addr = '0x' + wallet.getAddress().toString('hex')
        this.addresses.push(addr)
        this.wallets[addr] = wallet
        this.accounts.push('0x' + wallet.getPrivateKey().toString('hex'))
      }
    }
    // console.log(this.addresses)
    //console.log(this.addresses)
  }

}

module.exports = Leven
