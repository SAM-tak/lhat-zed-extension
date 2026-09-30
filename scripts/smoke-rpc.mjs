// Content-Length framing shared by the LSP and DAP smoke checks.
export class Rpc {
  #input = Buffer.alloc(0);
  #pending = new Map();
  #waiters = new Set();
  #id = 0;
  #output;
  #dap;
  #failure;

  constructor(input, output, dap = false) {
    this.#output = output;
    this.#dap = dap;
    input.on('data', chunk => {
      this.#input = Buffer.concat([this.#input, chunk]);
      while (true) {
        const separator = this.#input.indexOf('\r\n\r\n');
        if (separator < 0) return;
        const header = this.#input.subarray(0, separator).toString();
        const match = /Content-Length: (\d+)/i.exec(header);
        if (!match) return this.fail(new Error(`Invalid protocol header: ${header}`));
        const end = separator + 4 + Number(match[1]);
        if (this.#input.length < end) return;
        const message = JSON.parse(this.#input.subarray(separator + 4, end).toString());
        if (process.env.LHAT_SMOKE_TRACE) console.error('<', JSON.stringify(message));
        this.#input = this.#input.subarray(end);
        const id = dap ? message.request_seq : message.id;
        const pending = this.#pending.get(id);
        if (pending && (dap ? message.type === 'response' : !message.method)) {
          this.#pending.delete(id);
          clearTimeout(pending.timer);
          if (message.error || message.success === false) pending.reject(new Error(JSON.stringify(message)));
          else pending.resolve(dap ? message.body : message.result);
        } else if (!dap && message.method && message.id !== undefined) {
          // Current lhatls does not issue client requests in these checks.
          this.send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not implemented by smoke client' } });
        }
        for (const waiter of this.#waiters) {
          if (waiter.predicate(message)) {
            this.#waiters.delete(waiter);
            clearTimeout(waiter.timer);
            waiter.resolve(message);
          }
        }
      }
    });
    input.on('error', error => this.fail(error));
    output.on('error', error => this.fail(error));
  }

  send(message) {
    if (process.env.LHAT_SMOKE_TRACE) console.error('>', JSON.stringify(message));
    const body = JSON.stringify(message);
    this.#output.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  request(method, params) {
    if (this.#failure) return Promise.reject(this.#failure);
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timed out: ${method}`));
      }, 15000);
      this.#pending.set(id, { resolve, reject, timer });
      this.send(this.#dap
        ? { seq: id, type: 'request', command: method, arguments: params }
        : { jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  wait(predicate) {
    if (this.#failure) return Promise.reject(this.#failure);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: setTimeout(() => {
        this.#waiters.delete(waiter);
        reject(new Error('Timed out waiting for protocol event'));
      }, 15000) };
      this.#waiters.add(waiter);
    });
  }

  fail(error) {
    this.#failure = error;
    for (const pending of [...this.#pending.values(), ...this.#waiters]) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
    this.#waiters.clear();
  }

  close() { this.fail(new Error('Smoke client closed')); }
}
