import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Rpc } from './smoke-rpc.mjs';

const program = fileURLToPath(new URL('../examples/hello.lh', import.meta.url));
const cwd = fileURLToPath(new URL('../examples/', import.meta.url));
const listener = net.createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const executable = process.argv[2] ?? 'lhat';
const command = /[/\\]/.test(executable) ? path.resolve(executable) : executable;
const child = spawn(command, [`--dap=${port}`, program], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
let startupError;
child.on('error', error => { startupError = error; });
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });
child.stdout.on('data', chunk => process.stdout.write(chunk));
let socket;
let rpc;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error(`lhat exited: ${stderr}`);
    const candidate = net.connect(port, '127.0.0.1');
    try {
      await once(candidate, 'connect');
      socket = candidate;
      break;
    } catch {
      candidate.destroy();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.ok(socket, `DAP did not listen: ${stderr}`);
  rpc = new Rpc(socket, socket, true);
  const initialized = rpc.wait(message => message.event === 'initialized');
  const capabilities = await rpc.request('initialize', { clientID: 'lhat-zed-smoke', adapterID: 'Lhat', pathFormat: 'path', linesStartAt1: true, columnsStartAt1: true });
  assert.ok(capabilities.supportsConfigurationDoneRequest);
  await initialized;
  await rpc.request('launch', { program, cwd, stopOnEntry: true });
  const stopped = rpc.wait(message => message.event === 'stopped');
  await rpc.request('configurationDone', {});
  await stopped;
  const threads = await rpc.request('threads', {});
  assert.ok(threads.threads.length);
  const frames = await rpc.request('stackTrace', { threadId: threads.threads[0].id });
  assert.ok(frames.stackFrames.length);
  const scopes = await rpc.request('scopes', { frameId: frames.stackFrames[0].id });
  assert.ok(scopes.scopes.length);
  await rpc.request('disconnect', { terminateDebuggee: true });
  console.log('OK DAP: initialize, launch, stopOnEntry, threads, stackTrace, scopes, disconnect');
} finally {
  rpc?.close();
  socket?.destroy();
  child.kill();
}
