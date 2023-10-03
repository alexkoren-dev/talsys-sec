
const io = require('socket.io-client');
const config = require('./config');
const events = require('events');
const store = {};

const initSocket = apiKey => {
  const uri = config.io.server + '/' + config.io.namespace.allFilings;
  const params = { query: { apiKey } };
  store.socket = io(uri, params);
  store.socket.on('connect', () => console.log('Socket connected to', uri));
  store.socket.on('filing', handleNewFiling);
  store.socket.on('filings', handleNewFilings);
  store.socket.on('error', console.error);
};

const handleNewFiling = filing => {
  store.eventEmitter.emit('filing', filing);
};

const handleNewFilings = filings => {
  store.eventEmitter.emit('filings', filings);
};

const close = () => {
  if (store.socket.close) {
    store.socket.close();
  }
};

const connect = apiKey => {
  initSocket(apiKey);
  store.eventEmitter = new events.EventEmitter();
  return store.eventEmitter;
};

module.exports = connect;
module.exports.close = close;

if (require.main === module) {
  const apiKey = process.argv[2];
  const emitter = connect(apiKey);
  emitter.on('filing', filing => console.log(JSON.stringify(filing, null, 1)));
}
