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
