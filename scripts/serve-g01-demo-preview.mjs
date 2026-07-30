import { spawn, spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const env = {
  ...process.env,
  GITHUB_PAGES: 'true',
}

delete env.FAL_KEY
delete env.FAL_API_KEY
delete env.FAL_CREDENTIALS

const build = spawnSync(npm, ['run', 'build'], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

if (build.status !== 0) {
  if (build.error) {
    console.error(build.error)
  }
  process.exit(build.status ?? 1)
}

const preview = spawn(
  npm,
  ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4174'],
  {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
)

const stop = () => {
  if (!preview.killed) {
    preview.kill()
  }
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('exit', stop)
preview.on('exit', (code) => process.exit(code ?? 0))
