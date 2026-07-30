import { mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

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

const releaseDirectory = resolve('release')
const archive = resolve(releaseDirectory, 'starwreck-g01-demo-0.1.0.zip')
mkdirSync(releaseDirectory, { recursive: true })
rmSync(archive, { force: true })

const packaged =
  process.platform === 'win32'
    ? spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          'Compress-Archive -Path (Join-Path $PWD "dist\\*") -DestinationPath (Join-Path $PWD "release\\starwreck-g01-demo-0.1.0.zip") -CompressionLevel Optimal',
        ],
        { stdio: 'inherit' },
      )
    : spawnSync(
        'zip',
        ['-rq', archive, '.'],
        { cwd: resolve('dist'), stdio: 'inherit' },
      )

if (packaged.status !== 0) {
  process.exit(packaged.status ?? 1)
}

console.log(`G01_DEMO_PACKAGE_OK ${archive}`)
