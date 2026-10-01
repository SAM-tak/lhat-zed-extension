import { execFileSync } from 'node:child_process';
import { cli, grammars } from './grammar-path.mjs';

const command = process.argv[2];
if (!['generate', 'test'].includes(command)) throw new Error('Expected generate or test');
for (const { directory } of grammars) {
  execFileSync(cli, [command, ...(command === 'generate' ? ['--abi', '14'] : []), ...process.argv.slice(3)], { cwd: directory, stdio: 'inherit' });
}
