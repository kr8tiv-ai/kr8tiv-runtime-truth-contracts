import * as path from 'path';
import * as fs from 'fs';

const badPath = '/dev/null/impossible/path';
const resolved = path.resolve(badPath);
console.log('resolved:', resolved);
console.log('platform:', process.platform);

try {
  await fs.promises.mkdir(path.join(resolved, 'companion-1'), { recursive: true });
  console.log('mkdir succeeded');
  const fp = path.join(resolved, 'companion-1', 'training.jsonl');
  await fs.promises.appendFile(fp, 'hello\n', 'utf-8');
  console.log('appendFile succeeded');
  // cleanup
  await fs.promises.rm(resolved, { recursive: true, force: true });
} catch (e) {
  console.log('error:', e.code, e.message);
}
