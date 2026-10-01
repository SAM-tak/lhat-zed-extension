import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const grammarRoot = path.resolve(process.env.LHAT_GRAMMAR_PATH ?? path.join(root, '../tree-sitter-lhat'));
export const cli = path.join(root, 'node_modules/tree-sitter-cli', process.platform === 'win32' ? 'tree-sitter.exe' : 'tree-sitter');
export const grammars = [
  { name: 'lhat', directory: grammarRoot, example: path.join(root, 'examples/hello.lh') },
  { name: 'lton', directory: path.join(grammarRoot, 'lton'), example: path.join(root, 'examples/settings.lton') },
];

for (const { directory } of grammars) {
  if (!existsSync(path.join(directory, 'grammar.js'))) {
    throw new Error(`Grammar not found at ${directory}. Check out the separate tree-sitter-lhat repository beside this extension, or set LHAT_GRAMMAR_PATH to its root.`);
  }
}
