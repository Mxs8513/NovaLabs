import { execSync } from 'child_process';
try {
  execSync('npx tsc --noEmit', { cwd: '../', stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}