import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(process.env.FORMAL_SOURCE_ROOT ?? scriptRoot)
const manifestPath = resolve(process.env.FORMAL_SOURCE_MANIFEST ?? join(scriptRoot, 'source_packages/manifests/formal-source-mirror.json'))
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const cachePath = resolve(process.env.FORMAL_SOURCE_MIRROR_CACHE ?? join(tmpdir(), 'starwreck-formal-source', manifest.asset_name))
const expectedPaths = manifest.entries.map((entry) => entry.path.replaceAll('\\', '/')).sort()

const sha256 = async (path) => new Promise((resolveDigest, reject) => {
  const hash = createHash('sha256')
  const stream = createReadStream(path)
  stream.on('error', reject)
  stream.on('data', (chunk) => hash.update(chunk))
  stream.on('end', () => resolveDigest(hash.digest('hex')))
})

const matchesEntry = async (entry) => {
  const path = resolve(root, entry.path)
  if (!existsSync(path) || statSync(path).size !== entry.size) return false
  return await sha256(path) === entry.sha256
}

const missing = []
for (const entry of manifest.entries) if (!(await matchesEntry(entry))) missing.push(entry.path)
if (missing.length === 0) {
  console.log(`Formal source mirror: ${manifest.entries.length} files already verified.`)
  process.exit(0)
}

mkdirSync(dirname(cachePath), { recursive: true })
const cached = existsSync(cachePath) && statSync(cachePath).size === manifest.bundle_size && await sha256(cachePath) === manifest.bundle_sha256
if (!cached) {
  rmSync(cachePath, { force: true })
  console.log(`Downloading immutable formal-source mirror for ${missing.length} pointer or missing files...`)
  const response = await fetch(manifest.download_url, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`Formal source mirror download failed: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(cachePath, { flags: 'wx' }))
}

if (statSync(cachePath).size !== manifest.bundle_size) throw new Error('Formal source mirror size mismatch')
if (await sha256(cachePath) !== manifest.bundle_sha256) throw new Error('Formal source mirror SHA-256 mismatch')

const listing = spawnSync('tar', ['-tf', cachePath], { maxBuffer: 4 * 1024 * 1024 })
if (listing.status !== 0) throw new Error(`Cannot list formal source mirror: ${listing.stderr.toString()}`)
// Windows bsdtar writes listing bytes in the active ANSI code page, whereas
// GNU tar on Actions writes UTF-8. The archive itself remains PAX/UTF-8.
const listingText = new TextDecoder(process.platform === 'win32' ? 'gbk' : 'utf-8').decode(listing.stdout)
const archivePaths = listingText.split(/\r?\n/).filter(Boolean).map((path) => path.replace(/^\.\//, '').replaceAll('\\', '/')).sort()
for (const path of archivePaths) {
  const normalized = normalize(path)
  if (isAbsolute(path) || normalized === '..' || normalized.startsWith(`..${sep}`)) throw new Error(`Unsafe mirror entry: ${path}`)
}
if (JSON.stringify(archivePaths) !== JSON.stringify(expectedPaths)) throw new Error('Formal source mirror entry set does not match the committed manifest')

const extracted = spawnSync('tar', ['-xf', cachePath, '-C', root], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
if (extracted.status !== 0) throw new Error(`Cannot extract formal source mirror: ${extracted.stderr}`)

for (const entry of manifest.entries) {
  if (!(await matchesEntry(entry))) throw new Error(`Restored formal source failed SHA-256 validation: ${entry.path}`)
}
console.log(`Formal source mirror restored and verified: ${manifest.entries.length} files, bundle ${manifest.bundle_sha256}.`)
