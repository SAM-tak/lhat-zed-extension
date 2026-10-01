// Zed fetches grammar sources through Git even for dev extensions. Use a local
// committed checkout, keeping the development manifest out of source control.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { homedir } from 'node:os';
import { root, grammarRoot } from './grammar-path.mjs';

let revision;
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: grammarRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  for (const file of ['src/parser.c', 'lton/src/parser.c']) {
    execFileSync('git', ['cat-file', '-e', `${revision}:${file}`], { cwd: grammarRoot, stdio: 'pipe' });
  }
} catch {
  throw new Error(`Commit the grammar and generated parsers in ${grammarRoot} first. Zed requires a committed grammar revision.`);
}
const changes = execFileSync('git', ['status', '--porcelain'], { cwd: grammarRoot, encoding: 'utf8' });
if (changes.trim()) throw new Error('The grammar has uncommitted changes. Generate, test and commit it before preparing the dev extension.');

// Zed probes rustc before changing into the extension directory. A successful
// project build does not prove that the default toolchain supports WASI.
let targetLibdir;
try {
  targetLibdir = execFileSync('rustc', ['--print', 'target-libdir', '--target', 'wasm32-wasip2'], {
    cwd: homedir(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  throw new Error(
    'Rust outside the project cannot perform Zed\'s WASI target check.\n' +
    'Install Rust 1.93.1 and select it with: rustup default 1.93.1\n' +
    'Then run: rustup target add wasm32-wasip2\n' +
    String(error.stderr ?? error.message).trim(),
  );
}
if (!existsSync(targetLibdir)) {
  throw new Error('The Rust toolchain outside the project has no wasm32-wasip2 libraries. Run rustup target add wasm32-wasip2 from your home directory, then retry.');
}

const destination = path.join(root, 'dist/dev');
mkdirSync(destination, { recursive: true });
for (const name of ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'src', 'languages', 'debug_adapter_schemas']) {
  if (existsSync(path.join(root, name))) cpSync(path.join(root, name), path.join(destination, name), { recursive: true });
}
const manifest = readFileSync(path.join(root, 'extension.toml'), 'utf8')
  .replace(/(\[grammars\.(?:lhat|lton)\]\s*repository = )"[^"]+"/g, (_, prefix) => prefix + JSON.stringify(pathToFileURL(grammarRoot).href.replace(/\/$/, '')))
  .replace(/^rev = "[^"]+"/gm, `rev = "${revision}"`);
writeFileSync(path.join(destination, 'extension.toml'), manifest);
console.log(`In Zed, run "zed: install dev extension" and select:\n${destination}`);
