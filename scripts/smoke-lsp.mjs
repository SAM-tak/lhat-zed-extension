// Exercise the same stdio server and language IDs that Zed uses. No npm runtime
// dependencies; pass a locally built lhatls as the first argument.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Rpc } from './smoke-rpc.mjs';

const root = fileURLToPath(new URL('../examples/', import.meta.url));
const normalizeUri = uri => process.platform === 'win32' ? uri.toLowerCase() : uri;
const executable = process.argv[2] ?? 'lhatls';
const command = /[/\\]/.test(executable) ? path.resolve(executable) : executable;
const child = spawn(command, [], { cwd: root, stdio: ['pipe', 'pipe', 'inherit'] });
const rpc = new Rpc(child.stdout, child.stdin);
child.on('error', error => rpc.fail(error));
child.on('exit', code => rpc.fail(new Error(`lhatls exited (${code})`)));

try {
  const initialized = await rpc.request('initialize', {
    processId: process.pid,
    rootUri: pathToFileURL(root).href,
    workspaceFolders: [{ uri: pathToFileURL(root).href, name: 'examples' }],
    capabilities: { textDocument: { semanticTokens: { requests: { full: true }, tokenTypes: [], tokenModifiers: [], formats: ['relative'] } } },
  });
  for (const key of ['hoverProvider', 'definitionProvider', 'completionProvider', 'referencesProvider', 'renameProvider', 'codeActionProvider', 'semanticTokensProvider']) {
    assert.ok(initialized.capabilities[key], `Missing capability: ${key}`);
  }
  rpc.notify('initialized', {});
  for (const [name, languageId] of [['hello.lh', 'lhat'], ['settings.lton', 'lton']]) {
    const uri = pathToFileURL(path.join(root, name)).href;
    const text = readFileSync(path.join(root, name), 'utf8');
    const diagnostics = rpc.wait(message => message.method === 'textDocument/publishDiagnostics' && normalizeUri(message.params.uri) === normalizeUri(uri));
    rpc.notify('textDocument/didOpen', { textDocument: { uri, languageId, version: 1, text } });
    assert.deepEqual((await diagnostics).params.diagnostics, [], `${name}: unexpected diagnostics`);
    const tokens = await rpc.request('textDocument/semanticTokens/full', { textDocument: { uri } });
    assert.ok(tokens.data.length > 0, `${name}: no semantic tokens`);
    if (languageId === 'lhat') {
      const lines = text.split('\n');
      const line = lines.findIndex(line => line.includes('square(4)'));
      const position = { line, character: lines[line].indexOf('square') + 1 };
      const params = { textDocument: { uri }, position };
      assert.ok(await rpc.request('textDocument/hover', params), 'Missing hover');
      const definition = await rpc.request('textDocument/definition', params);
      assert.ok(definition && (!Array.isArray(definition) || definition.length), 'Missing definition');
      const references = await rpc.request('textDocument/references', { ...params, context: { includeDeclaration: true } });
      assert.ok(references.length >= 2, 'Missing declaration/reference');
      const rename = await rpc.request('textDocument/rename', { ...params, newName: 'squared' });
      assert.ok(rename.changes || rename.documentChanges, 'Missing rename edits');
      const errors = rpc.wait(message => message.method === 'textDocument/publishDiagnostics'
        && normalizeUri(message.params.uri) === normalizeUri(uri) && message.params.diagnostics.some(item => item.severity === 1));
      rpc.notify('textDocument/didChange', {
        textDocument: { uri, version: 2 },
        contentChanges: [{ text: 'let^ broken: number^ = "not a number"\n' }],
      });
      await errors;
      const cleared = rpc.wait(message => message.method === 'textDocument/publishDiagnostics'
        && normalizeUri(message.params.uri) === normalizeUri(uri) && message.params.diagnostics.length === 0);
      rpc.notify('textDocument/didChange', { textDocument: { uri, version: 3 }, contentChanges: [{ text }] });
      await cleared;
    }
    rpc.notify('textDocument/didClose', { textDocument: { uri } });
    console.log(`OK ${name}: diagnostics, tokens${languageId === 'lhat' ? ', hover, definition, references, rename, full sync' : ''}`);
  }
  await rpc.request('shutdown', null);
  rpc.notify('exit');
} finally {
  rpc.close();
  child.kill();
}
