// Preview an uncommitted grammar in an already installed dev extension.
// Zed's normal dev build fetches the committed grammar, so this path compiles
// the working tree with the same wasi-sdk flags and updates the preview only.
import { cpSync, existsSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { root, grammars } from './grammar-path.mjs';

const dev = path.join(root, 'dist/dev');
const grammarDir = path.join(dev, 'grammars');
if (!existsSync(path.join(dev, 'extension.wasm')) || !existsSync(grammarDir)) {
  throw new Error('Install dist/dev as a Zed dev extension before previewing a grammar.');
}
const sdk = process.env.WASI_SDK_PATH ?? (process.platform === 'win32' && process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Zed/extensions/build/wasi-sdk') : undefined);
if (!sdk) throw new Error('Set WASI_SDK_PATH to the wasi-sdk directory used by Zed.');
const clang = path.join(sdk, 'bin', process.platform === 'win32' ? 'clang.exe' : 'clang');
if (!existsSync(clang)) throw new Error(`wasi-sdk clang not found: ${clang}`);
for (const { name, directory } of grammars) {
  const source = path.join(directory, 'src');
  const output = path.join(grammarDir, `${name}.preview.wasm`);
  execFileSync(clang, [
    '-fPIC', '-shared', '-Os', `-Wl,--export=tree_sitter_${name}`,
    '-o', output, '-I', source, path.join(source, 'parser.c'), path.join(source, 'scanner.c'),
  ], { cwd: root, stdio: 'inherit' });
  renameSync(output, path.join(grammarDir, `${name}.wasm`));
}
cpSync(path.join(root, 'languages'), path.join(dev, 'languages'), { recursive: true });
console.log('Updated dist/dev grammar WASM and language queries. Reload extensions in Zed.');
console.log('This is a working-tree preview. Commit the grammar and run prepare:dev before a clean reinstall.');
