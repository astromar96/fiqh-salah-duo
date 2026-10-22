#!/usr/bin/env node
/**
 * ينشر محتوى dist/ على فرع gh-pages.
 *
 * نبني مستودعًا مؤقّتًا داخل dist/ (وهي مُستثناة في .gitignore) ثم ندفعه
 * دفعًا قسريًّا إلى الفرع. هكذا لا نلمس شجرة العمل ولا ننشئ worktree،
 * وتاريخ فرع النشر لا يعنينا إذ يُعاد توليده كاملًا في كل مرّة.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const BRANCH = 'gh-pages';

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html غير موجود — شغّل `npm run build:web` أولًا');
  process.exit(1);
}
if (!existsSync(join(DIST, '.nojekyll'))) {
  // بدونه يتجاهل Jekyll مجلّد _expo/ فتسقط كل الحزم.
  console.error('dist/.nojekyll مفقود — لن تُخدَم ملفات _expo/ على صفحات GitHub');
  process.exit(1);
}

const run = (args, cwd) => execFileSync('git', args, { cwd, stdio: 'inherit' });
const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT }).toString().trim();

rmSync(join(DIST, '.git'), { recursive: true, force: true });
run(['init', '-q', '-b', BRANCH], DIST);
run(['add', '-A'], DIST);
run(['-c', 'user.name=Omar', '-c', 'user.email=uniqueo2696@gmail.com',
     'commit', '-q', '-m', 'deploy: build web app'], DIST);
run(['push', '--force', '--quiet', url, `${BRANCH}:${BRANCH}`], DIST);
rmSync(join(DIST, '.git'), { recursive: true, force: true });

console.log(`pushed dist/ to ${BRANCH}`);
