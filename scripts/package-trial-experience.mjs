import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const env = { ...process.env, GITHUB_PAGES: 'true' }
delete env.FAL_KEY
delete env.FAL_API_KEY
delete env.FAL_CREDENTIALS

const build = spawnSync(npm, ['run', 'build'], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})
if (build.status !== 0) process.exit(build.status ?? 1)

copyFileSync(resolve('README_TRIAL.md'), resolve('dist', 'README_TRIAL.md'))

const releaseDirectory = resolve('release')
const archive = resolve(releaseDirectory, 'starwreck-trial-0.2.0.zip')
const checksumFile = resolve(releaseDirectory, 'starwreck-trial-0.2.0.sha256')
mkdirSync(releaseDirectory, { recursive: true })
rmSync(archive, { force: true })
rmSync(checksumFile, { force: true })

const packaged = process.platform === 'win32'
  ? spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      'Compress-Archive -Path (Join-Path $PWD "dist\\*") -DestinationPath (Join-Path $PWD "release\\starwreck-trial-0.2.0.zip") -CompressionLevel Optimal',
    ], { stdio: 'inherit' })
  : spawnSync('zip', ['-rq', archive, '.'], { cwd: resolve('dist'), stdio: 'inherit' })

if (packaged.status !== 0) process.exit(packaged.status ?? 1)

const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex')
writeFileSync(checksumFile, `${sha256}  starwreck-trial-0.2.0.zip\n`, 'utf8')
console.log(`TRIAL_EXPERIENCE_PACKAGE_OK ${archive}`)
console.log(`TRIAL_EXPERIENCE_PACKAGE_SHA256 ${sha256}`)
