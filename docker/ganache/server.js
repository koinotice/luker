const Ganache = require('ganache-core');
const shelljs = require('shelljs');

const db_path = 'data/db';
shelljs.mkdir('-p', db_path);

const server = Ganache.server({
  db_path: 'data/db',
  mnemonic: 'donkey safe jacket common label rural baby sort project mandate response disease',
  default_balance_ether: 10000,
  total_accounts: 40,
  blockTime: 0,
  network_id: 11235,
  // blocktime: 3
});
server.listen(8545, async (err, blockchain) => {
  if (err) {
    console.log('[ERR]', err.message);
    return;
  }
});
