import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(root, 'node_modules/tree-sitter-cli', process.platform === 'win32' ? 'tree-sitter.exe' : 'tree-sitter');
for (const name of readdirSync(path.join(root, 'languages/lhat')).filter(name => name.endsWith('.scm'))) {
  const query = path.join(root, 'languages/lhat', name);
  assert.equal(readFileSync(query, 'utf8'), readFileSync(path.join(root, 'languages/lton', name), 'utf8'), `${name}: LTON queries must match L^`);
  const result = spawnSync(cli, ['query', query, path.join(root, 'examples/hello.lh')], {
    cwd: path.join(root, 'tree-sitter-lhat'), encoding: 'utf8',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${name}: ${result.stderr}\n${result.stdout}`);
  console.log(`OK ${name}`);
}

// Check actual capture ranges, not just whether the query compiles. Hats inside
// strings/comments/name literals must retain their ordinary scopes; a keyword
// or builtin type must still have its own color on the word before the hat.
const result = spawnSync(cli, [
  'query', path.join(root, 'languages/lhat/highlights.scm'), path.join(root, 'examples/hats.lh'),
], { cwd: path.join(root, 'tree-sitter-lhat'), encoding: 'utf8' });
if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr);
const captures = [...result.stdout.matchAll(/capture: \d+ - ([\w.]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `([^\r\n]*)`/g)]
  .map(([, name, row, column, endRow, endColumn, text]) => ({ name, row: +row, column: +column, endRow: +endRow, endColumn: +endColumn, text }));
const hats = captures.filter(capture => capture.name === 'comment.lhat_hat');
assert.deepEqual(hats.map(({ row, column }) => [row, column]), [
  [1, 3], [1, 18], [2, 3], [3, 3], [4, 3], [5, 3], [5, 43],
]);
assert.ok(hats.every(capture => /^\^+$/.test(capture.text)));
assert.ok(captures.some(capture => capture.name === 'keyword' && capture.text === 'let'));
assert.ok(captures.some(capture => capture.name === 'type.builtin' && capture.text === 'number'));
assert.ok(!captures.some(capture => capture.name === 'variable' && capture.text === 'let'));
console.log('OK hat captures: suffixes only; words, strings, comments and name literals preserved');
