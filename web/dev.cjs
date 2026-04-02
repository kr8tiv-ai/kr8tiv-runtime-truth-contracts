// Dev launcher — forces NODE_ENV=development even when system has NODE_ENV=production
const { spawn } = require('child_process');
const path = require('path');

const env = Object.assign({}, process.env, { NODE_ENV: 'development' });

const child = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', '3001'], {
  cwd: __dirname,
  env,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
