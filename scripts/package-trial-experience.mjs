import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { deflateRawSync } from 'node:zlib'

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
const archive = resolve(releaseDirectory, 'starwreck-trial-0.4.0.zip')
const checksumFile = resolve(releaseDirectory, 'starwreck-trial-0.4.0.sha256')
mkdirSync(releaseDirectory, { recursive: true })
rmSync(archive, { force: true })
rmSync(checksumFile, { force: true })

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

const crc32 = (data) => {
  let value = 0xffffffff
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

const filesUnder = (root) => {
  const visit = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name)
    return entry.isDirectory() ? visit(absolute) : entry.isFile() ? [absolute] : []
  })
  return visit(root).sort((left, right) => relative(root, left).localeCompare(relative(root, right), 'en'))
}

const writeDeterministicZip = (sourceDirectory, outputPath) => {
  const localParts = []
  const centralParts = []
  let offset = 0
  const dosDate = 0x21 // 1980-01-01; ZIP's earliest portable date.

  for (const absolute of filesUnder(sourceDirectory)) {
    if (!statSync(absolute).isFile()) continue
    const name = relative(sourceDirectory, absolute).replaceAll('\\', '/')
    const nameBytes = Buffer.from(name, 'utf8')
    const content = readFileSync(absolute)
    const compressed = deflateRawSync(content, { level: 9 })
    const checksum = crc32(content)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(nameBytes.length, 26)
    localHeader.writeUInt16LE(0, 28)
    localParts.push(localHeader, nameBytes, compressed)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(0x0314, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(nameBytes.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38)
    centralHeader.writeUInt32LE(offset, 42)
    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.length + nameBytes.length + compressed.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const entryCount = centralParts.length / 2
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entryCount, 8)
  end.writeUInt16LE(entryCount, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  writeFileSync(outputPath, Buffer.concat([...localParts, centralDirectory, end]))
}

writeDeterministicZip(resolve('dist'), archive)

const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex')
writeFileSync(checksumFile, `${sha256}  starwreck-trial-0.4.0.zip\n`, 'utf8')
console.log(`TRIAL_EXPERIENCE_PACKAGE_OK ${archive}`)
console.log(`TRIAL_EXPERIENCE_PACKAGE_SHA256 ${sha256}`)
