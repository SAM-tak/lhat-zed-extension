import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, cli, grammarRoot, grammars } from './grammar-path.mjs';
for (const { name: language, directory, example } of grammars) {
  for (const name of readdirSync(path.join(root, 'languages', language)).filter(name => name.endsWith('.scm'))) {
    const query = path.join(root, 'languages', language, name);
    const result = spawnSync(cli, ['query', query, example], {
      cwd: directory, encoding: 'utf8',
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${name}: ${result.stderr}\n${result.stdout}`);
    console.log(`OK ${language}/${name}`);
  }
}

// Check actual capture ranges, not just whether the query compiles. Hats inside
// strings/comments/name literals must retain their ordinary scopes; a keyword
// or builtin type must still have its own color on the word before the hat.
const result = spawnSync(cli, [
  'query', path.join(root, 'languages/lhat/highlights.scm'), path.join(root, 'examples/hats.lh'),
], { cwd: grammarRoot, encoding: 'utf8' });
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

for (const { name, directory, example } of grammars) {
  const file = name === 'lhat' ? path.join(root, 'examples/structure.lh') : example;
  const parsed = spawnSync(cli, ['parse', '--quiet', file], { cwd: directory, encoding: 'utf8' });
  assert.equal(parsed.status, 0, parsed.stdout + parsed.stderr);
  const outline = spawnSync(cli, ['query', path.join(root, 'languages', name, 'outline.scm'), file], { cwd: directory, encoding: 'utf8' });
  assert.equal(outline.status, 0, outline.stderr);
  const names = [...outline.stdout.matchAll(/capture: \d+ - name,.*text: `([^`]+)`/g)].map(match => match[1]);
  for (const expected of name === 'lhat' ? ['example', 'if', 'factorial', 'Counter', 'increment', 'get', 'Color'] : ['name', 'enabled', 'values']) {
    assert.ok(names.includes(expected), `${name} outline is missing ${expected}: ${names}`);
  }
  console.log(`OK ${name} outline names`);
}
