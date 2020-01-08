const { fork } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

class TSServer {
  constructor() {
    this._responseEventEmitter = new EventEmitter();
    this._responseCommandEmitter = new EventEmitter();
    const tsserverPath = require.resolve('typescript/lib/tsserver');
    const server = fork(tsserverPath, {
      cwd: path.join(__dirname, '../../project-fixtures/simple-prj'),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    this._exitPromise = new Promise((resolve, reject) => {
      server.on('exit', code => resolve(code));
      server.on('error', reason => reject(reason));
    });
    server.stdout.setEncoding('utf-8');
    server.stdout.on('data', data => {
      const [, , res] = data.split('\n');
      const obj = JSON.parse(res);
      if (obj.type === 'event') {
        this._responseEventEmitter.emit(obj.event, obj);
      } else if (obj.type === 'response') {
        this._responseCommandEmitter.emit(obj.command, obj);
      }
      this.responses.push(obj);
    });
    this._isClosed = false;
    this._server = server;
    this._seq = 0;
    this.responses = [];
  }

  send(command) {
    const seq = ++this._seq;
    const req = JSON.stringify(Object.assign({ seq: seq, type: 'request' }, command)) + '\n';
    this._server.stdin.write(req);
  }

  close() {
    if (!this._isClosed) {
      this._isClosed = true;
      this._server.stdin.end();
    }
    return this._exitPromise;
  }

  wait(time = 0) {
    return new Promise(res => setTimeout(() => res(), time));
  }

  waitEvent(eventName) {
    return new Promise(res => this._responseEventEmitter.once(eventName, () => res()));
  }

  waitResponse(commandName) {
    return new Promise(res => this._responseCommandEmitter.once(commandName, () => res()));
  }
}

function createServer() {
  return new TSServer();
}

module.exports = createServer;
