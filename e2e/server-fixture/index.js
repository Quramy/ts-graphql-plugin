const { fork } = require('child_process');
const path = require('path');

class TSServer {
  constructor() {
    const tsserverPath = require.resolve('typescript/lib/tsserver');
    const server = fork(tsserverPath, { 
      cwd: path.join(__dirname, '../project-fixture'),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    this._exitPromise = new Promise((resolve, reject) => {
      server.on('exit', code => resolve(code));
      server.on('error', reason => reject(reason));
    });
    server.stdout.setEncoding('utf-8');
    server.stdout.on('data', data => {
      const [,, res] = data.split('\n');
      this.responses.push(JSON.parse(res));
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
}

function createServer() {
  return new TSServer();
}

module.exports = createServer;
