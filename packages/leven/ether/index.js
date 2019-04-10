'use strict';
const _ = require('lodash');
const Web3 = require('web3');
const ethjs = require('ethereumjs-util');
const ethjstx = require('ethereumjs-tx');
const cw3p = require('../create-web3-provider');
const ens = require('ez-ens');
const util = require('./util');
const BigNumber = require('bignumber.js');
const assert = require('assert');

module.exports = class FlexEther {
  constructor(opts = {}) {

    console.log(opts)
    this.web3 = getWeb3(opts);
    this.gasBonus = _.isNumber(opts.gasBonus) ? opts.gasBonus : 0.66;
    this.gasPriceBonus = _.isNumber(opts.gasPriceBonus) ?
      opts.gasPriceBonus : -0.005;
  }

  get web3() {
    return this._web3;
  }

  set web3(inst) {
    this._web3 = inst;
    this._chainId = inst.eth.net.getId();

  }

  async getChainId() {
    return this._chainId;
  }

  async setChainId(id) {

    this._chainId = id;
  }

  async getDefaultAccount() {
    return this._web3.eth.defaultAccount || getFirstAccount(this._web3);
  }

  async getTransactionCount(addr) {
    addr = await this.resolveAddress(addr);
    return this._web3.eth.getTransactionCount(addr);
  }

  async getBalance(addr, block) {
    addr = await this.resolveAddress(addr);
    return (await this._web3.eth.getBalance(addr, block)).toString(10);
  }

  async getGasPrice(bonus = 0, max = 0) {
    bonus = (_.isNumber(bonus) ? bonus : this.gasPriceBonus) || 0;
    max = max || module.exports.MAX_GAS_PRICE;
    let price = new BigNumber(await this._web3.eth.getGasPrice())
      .times(1 + bonus);
    if (price.gt(max))
      price = new BigNumber(max);
    return price.toString(10);
  }

  async estimateGas(to, opts = {}) {
    const txOpts = await createTransactionOpts(this, to, opts);
    return await estimateGasRaw(this, txOpts, opts.gasBonus);
  }

  send(to, opts = {}) {
    return wrapSendTxPromise(sendTx(this, to, opts));
  }

  sendTx(to, opts = {}) {

    return sendTx(this, to, opts);
  }


  transfer(to, amount, opts) {
    return wrapSendTxPromise(
      sendTx(this, to, _.assign({}, opts, { value: amount })));
  }

  call(to, opts = {}) {
    return callTx(this, to, opts);
  }

  async getBlockNumber() {
    return this._web3.eth.getBlockNumber();
  }

  async resolveBlockDirective(block = -1) {
    if (_.isNumber(block)) {
      if (block < 0) {
        let n = await this._web3.eth.getBlockNumber();
        n += (block + 1);
        if (n < 0)
          throw Error(`Block number offset is too large: ${block}`);
        return n;
      }
      return block;
    }
    return block;
  }

  async resolveAddress(addr) {
    if (!addr)
      throw new Error('Invalid address.');
    return module.exports.ens.resolve(addr, { web3: this._web3 });
  }
};

module.exports.MAX_GAS_PRICE = new BigNumber('256e9').toString(10); // 256 gwei
module.exports.ens = ens;

function getWeb3(opts = {}) {
  if (opts.web3)
    return opts.web3;
  const provider = opts.provider || cw3p({
    uri: opts.providerURI,
    network: opts.network,
    net: opts.net,
    infuraKey: opts.infuraKey,
  });
  return new Web3(provider);
}

async function getBlockGasLimit(inst) {
  while (true) {
    const lastBlock = await inst._web3.eth.getBlock('latest');
    if (lastBlock != null)
      return lastBlock.gasLimit;
  }
}

async function estimateGasRaw(inst, txOpts, bonus) {
  txOpts = _.assign({}, txOpts, {
    gasPrice: 1,
    gasLimit: await getBlockGasLimit(inst),
  });
  bonus = (_.isNumber(bonus) ? bonus : inst.gasBonus) || 0;
  const gas = await inst._web3.eth.estimateGas(normalizeTxOpts(txOpts));
  return Math.ceil(gas * (1 + bonus));
}

async function createTransactionOpts(inst, to, opts) {
  const web3 = inst._web3;
  let from = undefined;
  if (opts.from === null) {
    // Explicitly leaving it undefined.
  } else if (_.isString(opts.from)) {
    from = await inst.resolveAddress(opts.from);
  } else if (_.isNumber(opts.from)) {
    from = opts.from;
  } else if (opts.key)
    from = util.privateKeyToAddress(opts.key);
  else
    from = await inst.getDefaultAccount();
  to = to ? await inst.resolveAddress(to) : undefined;
  return {
    gasPrice: opts.gasPrice,
    gas: opts.gasLimit || opts.gas,
    value: opts.value || 0,
    data: opts.data,
    to: to,
    from: from,
  };
}

function normalizeTxOpts(opts) {
  const _opts = {};
  _opts.gasPrice = util.toHex(opts.gasPrice || 0);
  _opts.gas = util.toHex(opts.gasLimit || opts.gas || 0);
  _opts.value = util.toHex(opts.value || 0);
  if (!_.isNil(opts.nonce))
    _opts.nonce = parseInt(opts.nonce);
  if (opts.data && opts.data != '0x')
    _opts.data = util.toHex(opts.data);
  else
    _opts.data = '0x';
  if (_.isString(opts.to))
    _opts.to = ethjs.toChecksumAddress(opts.to);
  if (_.isString(opts.from))
    _opts.from = ethjs.toChecksumAddress(opts.from);
  return _opts;
}

async function callTx(inst, to, opts) {
  const block = _.isNil(opts.block) ?
    undefined : await inst.resolveBlockDirective(opts.block);
  const txOpts = await createTransactionOpts(inst, to, opts);
  _.defaults(txOpts, {
    gasPrice: 1,
    gasLimit: await getBlockGasLimit(inst),
  });
  if (!txOpts.to && (!txOpts.data || txOpts.data == '0x'))
    throw Error('Transaction has no destination.');
  return inst._web3.eth.call(normalizeTxOpts(txOpts), block);
}

async function sendTx(inst, to, opts) {
  const txOpts = await createTransactionOpts(inst, to, opts);
  if (!txOpts.from) {
    throw Error('Cannot determine caller.');
  }
  if (!txOpts.to && (!txOpts.data || txOpts.data == '0x')) {
    throw Error('Transaction has no destination.');
  }
  if (_.isNumber(opts.nonce)) {
    txOpts.nonce = opts.nonce;
  }
  else {
    txOpts.nonce = await inst.getTransactionCount(txOpts.from);
  }
  if (!txOpts.gasPrice)
    txOpts.gasPrice = await inst.getGasPrice(opts.gasPriceBonus);
  if (!txOpts.gasLimit)
    txOpts.gasLimit = await estimateGasRaw(inst, txOpts, opts.gasBonus);
  if (!txOpts.chainId)
    txOpts.chainId = await inst._chainId;
  let sent = null;
  if (opts.key) {
    // Sign the TX ourselves.
    const tx = new ethjstx(normalizeTxOpts(txOpts));
    tx.sign(ethjs.toBuffer(opts.key));
    const serialized = util.toHex(tx.serialize());

    try {
      sent = inst._web3.eth.sendSignedTransaction(serialized);
    } catch (e) {
      console.log(e.message);
    }
  } else {
    // Let the provider sign it.
    sent = inst._web3.eth.sendTransaction(normalizeTxOpts(txOpts));
  }

  return { sent: sent };
}

async function getFirstAccount(web3) {
  const accts = await web3.eth.getAccounts();
  if (accts && accts.length)
    return accts[0];
}

function wrapSendTxPromise(promise) {
  // Resolved receipt object.
  let receipt = undefined;
  // Number of confirmations seen.
  let confirmations = 0;
  // Count confirmations.
  promise.then(({ sent }) => {
    const handler = (n, _receipt) => {
      console.log(n);
      receipt = _receipt;
      confirmations = Math.max(confirmations, n);
      console.log(confirmations);
      // Don't listen beyond 12 confirmations.
      if (n >= 12)
        sent.removeAllListeners();
    };
    sent.on('confirmation', handler);
  });
  // Create a promise that resolves with the receipt.
  const wrapper = new Promise(async (accept, reject) => {
    promise.catch(reject);
    promise.then(({ sent, address }) => {
      sent.on('error', reject);
      sent.on('receipt', r => {
        if (!r.status)
          return reject('Transaction failed.');
        try {
          return accept(r);
        } catch (err) {
          reject(err);
        }
      });
    });
  });
  wrapper.catch(e => {
    console.log('promise error', e.message);
  });
  wrapper.receipt = wrapper;
  // Create a promise that resolves with the transaction hash.
  wrapper.txId = new Promise((accept, reject) => {
    promise.catch(reject);
    promise.then(({ sent }) => {
      sent.on('error', reject);
      sent.on('transactionHash', accept);
    });
  });
  // Create a function that creates a promise that resolves after a number of
  // confirmations.
  wrapper.confirmed = (count = 1) => {
    console.log(count);
    // Zero confirmations is the same as waiting on the receipt.
    if (count == 0)
      return wrapper.receipt;
    if (count > 12)
      throw new Error('Maximum confirmations is 12.');

    //console.log(confirmations)
    // If we've already seen the confirmation, resolve immediately.
    if (confirmations >= count && receipt) {
      return Promise.resolve(receipt);
    }
    // Create a promise that'll get called by the confirmation handler.
    return new Promise((accept, reject) => {
      promise.catch(reject);
      promise.then(({ sent }) => {
        sent.on('error', reject);
        sent.on('confirmation', (_count, receipt) => {

          if (_count == count)
            accept(receipt);
        });
      });
    });
  };
  return wrapper;
}
