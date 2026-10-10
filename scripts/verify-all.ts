import { spawnSync } from 'child_process';

interface StepResult {
  name: string;
  command: string;
  passed: boolean;
  durationMs: number;
  output: string;
}

const steps: { name: string; cmd: string; args: string[] }[] = [
  {
    name: 'ESLint Static Analysis',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm run lint'] : ['run', 'lint'],
  },
  {
    name: 'Core Domain Invariants (35 Rules)',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm test'] : ['test'],
  },
  {
    name: 'Mobile Companion API (28 Endpoints)',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm run test:mobile'] : ['run', 'test:mobile'],
  },
  {
    name: 'Mobile TypeScript Typecheck',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm run mobile:check'] : ['run', 'mobile:check'],
  },
  {
    name: 'Next.js Production Build',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm run build'] : ['run', 'build'],
  },
];

console.log('====================================================');
console.log('🛡️  SLATE FULL-SYSTEM VERIFICATION HARNESS');
console.log('====================================================\n');

const results: StepResult[] = [];
let allPassed = true;

for (const step of steps) {
  process.stdout.write(`⏳ Running ${step.name}... `);
  const start = Date.now();

  const child = spawnSync(step.cmd, step.args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    env: process.env,
  });

  const durationMs = Date.now() - start;
  const passed = child.status === 0;

  if (passed) {
    console.log(`✅ PASS (${(durationMs / 1000).toFixed(1)}s)`);
  } else {
    console.log(`❌ FAIL (${(durationMs / 1000).toFixed(1)}s)`);
    allPassed = false;
  }

  results.push({
    name: step.name,
    command: `${step.cmd} ${step.args.join(' ')}`,
    passed,
    durationMs,
    output: (child.stdout || '') + '\n' + (child.stderr || ''),
  });

  if (!passed) {
    console.log('\n--- Failure Output ---');
    console.log(child.stdout);
    console.log(child.stderr);
    console.log('----------------------\n');
  }
}

console.log('\n====================================================');
console.log('📊 VERIFICATION SUMMARY');
console.log('====================================================');

results.forEach((r, idx) => {
  const icon = r.passed ? '✅ PASS' : '❌ FAIL';
  const duration = `${(r.durationMs / 1000).toFixed(1)}s`;
  console.log(`${idx + 1}. ${r.name.padEnd(38)} [${icon}] (${duration})`);
});

console.log('====================================================');
if (allPassed) {
  console.log('🎯 100% HEALTH: ALL 5 SYSTEM CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error('⚠️  VERIFICATION FAILED: Resolve issues before deployment.');
  console.log('====================================================\n');
  process.exit(1);
}
