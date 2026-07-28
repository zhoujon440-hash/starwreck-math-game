#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { inflateRawSync, inflateSync } from 'node:zlib'

const expected = {
  xingyu: ['normal', 'alert', 'thinking', 'nervous', 'determined'],
  qima: ['offline', 'damaged', 'booting', 'normal', 'question', 'warning', 'proud', 'awkward', 'scanning'],
}

const args = process.argv.slice(2)
const fixtureIndex = args.indexOf('--fixture')
const fixturePath = fixtureIndex >= 0 ? resolve(args[fixtureIndex + 1]) : null
const rootIndex = args.indexOf('--root')
const root = resolve(rootIndex >= 0 ? args[rootIndex + 1] : process.cwd())
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8')) : null
const mutation = fixture?.mutation ?? null
const errors = []
let currentBranch = process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? ''
if (!currentBranch) {
  try {
    currentBranch = execFileSync('git', ['branch', '--show-current'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
  } catch {}
}
const enforceIssue8Scope =
  args.includes('--enforce-issue8-scope') ||
  currentBranch === 'codex/runtime-character-assets-v1' ||
  mutation?.type === 'forbidden_change'

const rel = (path) => relative(root, path).split(sep).join('/')
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const fail = (rule, path, actual, expectedValue, source, fix) => {
  errors.push({ rule, path, actual, expected: expectedValue, source, fix })
}

const parsePng = (buffer) => {
  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('invalid PNG signature')
  }
  let offset = 8
  let width
  let height
  let bitDepth
  let colorType
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    offset += length + 12
    if (type === 'IEND') break
  }
  if (!width || !height || bitDepth !== 8 || colorType !== 6) {
    return { width, height, bitDepth, colorType, alphaZero: 0, alphaOpaque: width * height, alphaPartial: 0, borderWhiteRatio: 0 }
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const decoded = Buffer.alloc(stride * height)
  let input = 0
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++]
    const row = y * stride
    const prior = row - stride
    for (let x = 0; x < stride; x += 1) {
      const value = raw[input++]
      const left = x >= 4 ? decoded[row + x - 4] : 0
      const up = y > 0 ? decoded[prior + x] : 0
      const upperLeft = y > 0 && x >= 4 ? decoded[prior + x - 4] : 0
      decoded[row + x] =
        filter === 0 ? value :
        filter === 1 ? (value + left) & 255 :
        filter === 2 ? (value + up) & 255 :
        filter === 3 ? (value + Math.floor((left + up) / 2)) & 255 :
        filter === 4 ? (value + paeth(left, up, upperLeft)) & 255 :
        (() => { throw new Error(`unsupported PNG filter ${filter}`) })()
    }
  }
  let alphaZero = 0
  let alphaOpaque = 0
  let alphaPartial = 0
  let borderWhite = 0
  let borderCount = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * stride + x * 4
      const alpha = decoded[index + 3]
      if (alpha === 0) alphaZero += 1
      else if (alpha === 255) alphaOpaque += 1
      else alphaPartial += 1
      if (x < 8 || y < 8 || x >= width - 8 || y >= height - 8) {
        borderCount += 1
        if (decoded[index] > 245 && decoded[index + 1] > 245 && decoded[index + 2] > 245 && alpha === 255) borderWhite += 1
      }
    }
  }
  return { width, height, bitDepth, colorType, alphaZero, alphaOpaque, alphaPartial, borderWhiteRatio: borderWhite / borderCount }
}

const zipEntry = (zip, wanted) => {
  const start = Math.max(0, zip.length - 65557)
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]), zip.length - 1)
  if (eocd < start) return null
  const count = zip.readUInt16LE(eocd + 10)
  let offset = zip.readUInt32LE(eocd + 16)
  for (let index = 0; index < count; index += 1) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) return null
    const method = zip.readUInt16LE(offset + 10)
    const compressedSize = zip.readUInt32LE(offset + 20)
    const fileNameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const localOffset = zip.readUInt32LE(offset + 42)
    const name = zip.toString('utf8', offset + 46, offset + 46 + fileNameLength)
    if (name === wanted) {
      const localNameLength = zip.readUInt16LE(localOffset + 26)
      const localExtraLength = zip.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLength + localExtraLength
      const compressed = zip.subarray(dataStart, dataStart + compressedSize)
      return method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null
    }
    offset += 46 + fileNameLength + extraLength + commentLength
  }
  return null
}

const provenancePath = resolve(root, 'docs/characters/CHARACTER_ASSET_PROVENANCE.json')
let provenance = existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : null
if (!provenance) {
  fail('CHAR-007-PROVENANCE', rel(provenancePath), 'missing', 'valid provenance JSON', 'Issue #8 §14/§16', 'Generate the provenance manifest.')
  provenance = { characters: [], runtime_assets: [], design_sources: [] }
}

if (mutation?.type === 'wrong_qima_id') provenance.characters.find((item) => item.runtime_key === 'qima').official_id = mutation.value
if (mutation?.type === 'legacy_name') provenance.characters.find((item) => item.runtime_key === 'xingyu').character_name = mutation.value
if (mutation?.type === 'source_pr5') provenance.source_entry = mutation.value
if (mutation?.type === 'bad_source_sha') provenance.source_entry_sha256 = mutation.value
if (mutation?.type === 'design_runtime_true') provenance.design_sources[0].runtime_asset = true

const fileHashByCharacter = {}
for (const [character, states] of Object.entries(expected)) {
  const directory = resolve(root, `public/assets/characters/${character}`)
  const wantedNames = states.map((state) => `${character}_${state}.png`).sort()
  const actualNames = existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith('.png')).sort() : []
  if (JSON.stringify(actualNames) !== JSON.stringify(wantedNames)) {
    fail('CHAR-002-FILENAME', rel(directory), JSON.stringify(actualNames), JSON.stringify(wantedNames), 'Issue #8 §11/§16', 'Restore the exact fixed runtime filenames and remove extras.')
  }
  const hashes = []
  for (const state of states) {
    const relativePath = `public/assets/characters/${character}/${character}_${state}.png`
    const path = resolve(root, relativePath)
    const virtuallyMissing = mutation?.type === 'missing_file' && mutation.path === relativePath
    if (!existsSync(path) || virtuallyMissing) {
      fail('CHAR-001-MISSING', relativePath, 'missing', 'existing non-empty PNG', 'Issue #8 §7/§9/§16', 'Restore the required state PNG.')
      continue
    }
    const bytes = readFileSync(path)
    if (bytes.length === 0) {
      fail('CHAR-001-MISSING', relativePath, 0, '> 0 bytes', 'Issue #8 §12', 'Regenerate the runtime PNG.')
      continue
    }
    let info
    try {
      info = parsePng(bytes)
    } catch (error) {
      fail('CHAR-003-PNG-RGBA', relativePath, String(error), 'valid RGBA PNG', 'Issue #8 §12', 'Export the file as an 8-bit RGBA PNG.')
      continue
    }
    if (mutation?.type === 'png_no_alpha' && mutation.path === relativePath) info.colorType = 2
    if (mutation?.type === 'opaque_white' && mutation.path === relativePath) {
      info.alphaZero = 0
      info.alphaOpaque = info.width * info.height
      info.alphaPartial = 0
      info.borderWhiteRatio = 1
    }
    if (mutation?.type === 'small_size' && mutation.path === relativePath) {
      info.width = mutation.width
      info.height = mutation.height
    }
    if (info.colorType !== 6 || info.bitDepth !== 8) {
      fail('CHAR-003-PNG-RGBA', relativePath, `colorType=${info.colorType}, bitDepth=${info.bitDepth}`, 'colorType=6, bitDepth=8', 'Issue #8 §12/§16', 'Export as 8-bit RGBA PNG.')
    }
    if (info.alphaZero === 0 || info.alphaOpaque === 0) {
      fail('CHAR-004-ALPHA', relativePath, `transparent=${info.alphaZero}, opaque=${info.alphaOpaque}`, 'both transparent and visible pixels', 'Issue #8 §12/§16', 'Remove the board background and preserve a real alpha channel.')
    }
    if (info.borderWhiteRatio > 0.8) {
      fail('CHAR-019-WHITE-BACKGROUND', relativePath, `whiteBorderRatio=${info.borderWhiteRatio}`, '<= 0.8', 'Issue #8 §12/§17', 'Remove the opaque white background instead of faking transparency.')
    }
    if (Math.max(info.width, info.height) < 1600) {
      fail('CHAR-005-DIMENSION', relativePath, `${info.width}x${info.height}`, 'longest edge >= 1600', 'Issue #8 §12/§16', 'Re-export from the normalized high-resolution master.')
    }
    hashes.push(sha256(bytes))
    const record = provenance.runtime_assets.find((item) => item.path === relativePath)
    if (!record || record.runtime_asset !== true || record.sha256 !== sha256(bytes)) {
      fail('CHAR-013-RUNTIME-FLAG', relativePath, record ?? 'missing record', 'runtime_asset=true with matching SHA-256', 'Issue #8 §16', 'Regenerate and synchronize the provenance record.')
    }
  }
  if (mutation?.type === 'duplicate_states' && mutation.character === character && hashes.length) hashes.fill(hashes[0])
  fileHashByCharacter[character] = hashes
  if (new Set(hashes).size !== hashes.length) {
    fail('CHAR-006-DUPLICATE', `public/assets/characters/${character}`, new Set(hashes).size, hashes.length, 'Issue #8 §16/§17', 'Produce genuine state-specific visual layers instead of duplicating one file.')
  }
}

for (const [character, states] of Object.entries(expected)) {
  const record = provenance.characters.find((item) => item.runtime_key === character)
  if (!record || JSON.stringify(record.states) !== JSON.stringify(states)) {
    fail('CHAR-011-STATE-COUNT', `provenance.characters.${character}.states`, record?.states ?? 'missing', states, 'Issue #8 §7/§9', 'Restore the frozen state list in order.')
  }
}
const qima = provenance.characters.find((item) => item.runtime_key === 'qima')
if (qima?.official_id !== 'EDU-0077') {
  fail('CHAR-012-QIMA-ID', 'docs/characters/CHARACTER_ASSET_PROVENANCE.json', qima?.official_id, 'EDU-0077', 'CHAR-002_QIMA.md', 'Restore the frozen companion identifier.')
}
const xingyu = provenance.characters.find((item) => item.runtime_key === 'xingyu')
if (xingyu?.character_name !== '星宇') {
  fail('CHAR-015-FORBIDDEN-NAME', 'docs/characters/CHARACTER_ASSET_PROVENANCE.json', xingyu?.character_name, '星宇', 'CHAR-001_XINGYU.md', 'Use the frozen protagonist name only.')
}
if (provenance.source_package !== 'PKG-CHARACTERS-V2.1') {
  fail('CHAR-008-SOURCE-PACKAGE', 'docs/characters/CHARACTER_ASSET_PROVENANCE.json', provenance.source_package, 'PKG-CHARACTERS-V2.1', 'Issue #8 §4', 'Point provenance to the formal character package.')
}
if (String(provenance.source_entry).toLowerCase().includes('pr5') || String(provenance.source_entry).includes('pull/5')) {
  fail('CHAR-016-PR5', 'docs/characters/CHARACTER_ASSET_PROVENANCE.json', provenance.source_entry, 'formal V2.1 entry', 'PR #5 close decision', 'Remove every PR #5 asset reference.')
}

const sourceManifest = JSON.parse(readFileSync(resolve(root, 'source_packages/manifests/source-packages.json'), 'utf8'))
const packageRecord = sourceManifest.imported.find((item) => item.package_id === 'PKG-CHARACTERS-V2.1')
const packagePath = packageRecord ? resolve(root, packageRecord.repository_path) : null
if (!packageRecord || !packagePath || !existsSync(packagePath)) {
  fail('CHAR-008-SOURCE-PACKAGE', 'source_packages/manifests/source-packages.json', packageRecord ?? 'missing', 'imported PKG-CHARACTERS-V2.1', 'Issue #6 source manifest', 'Restore the verified formal source package.')
} else {
  const zip = readFileSync(packagePath)
  const entryBytes = zipEntry(zip, provenance.source_entry)
  if (!entryBytes) {
    fail('CHAR-009-SOURCE-ENTRY', provenance.source_entry, 'not found in ZIP', 'existing formal ZIP entry', 'Issue #8 §4/§16', 'Use the exact package-internal path.')
  } else if (sha256(entryBytes) !== provenance.source_entry_sha256) {
    fail('CHAR-010-SOURCE-SHA', provenance.source_entry, provenance.source_entry_sha256, sha256(entryBytes), 'PKG-CHARACTERS-V2.1', 'Recompute provenance from the actual ZIP entry.')
  }
}
for (const source of provenance.design_sources) {
  if (source.runtime_asset !== false) {
    fail('CHAR-014-DESIGN-FLAG', source.path, source.runtime_asset, false, 'Issue #8 §16', 'Keep design/master art marked runtime_asset=false.')
  }
}

const runtimeRoot = resolve(root, 'public/assets/characters')
const runtimeDirectories = existsSync(runtimeRoot)
  ? readdirSync(runtimeRoot).filter((name) => statSync(resolve(runtimeRoot, name)).isDirectory())
  : []
if (mutation?.type === 'extra_runtime_dir') runtimeDirectories.push(mutation.name)
const unexpectedDirectories = runtimeDirectories.filter((name) => !['xingyu', 'qima'].includes(name))
if (unexpectedDirectories.length) {
  fail('CHAR-017-SCOPE-DIR', 'public/assets/characters', unexpectedDirectories, ['xingyu', 'qima'], 'Issue #8 §2/§16', 'Remove runtime directories for the other 69 characters.')
}

const allowedChange = /^(?:public\/assets\/characters\/(?:xingyu|qima)\/|public\/acceptance\/character-assets\/|public\/character-asset-acceptance\.html$|art\/(?:source\/characters|runtime-extraction)\/(?:xingyu|qima)\/|docs\/characters\/|docs\/review\/CHARACTER_|docs\/review\/character-assets\/|scripts\/(?:build_character_assets\.py|validate-character-assets\.mjs)|tests\/characters\/|tests\/fixtures\/baseline-negative\/characters\/|tests-e2e\/character-assets\.spec\.ts$|\.github\/workflows\/character-assets-gate\.yml$|package\.json$)/
let changed = []
try {
  changed.push(...execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/))
} catch {}
try {
  changed.push(...execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/))
  changed.push(...execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/))
  changed.push(...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/))
} catch {}
if (mutation?.type === 'forbidden_change') changed.push(mutation.path)
changed = [...new Set(changed.filter(Boolean).map((name) => name.replaceAll('\\', '/')))]
if (enforceIssue8Scope) {
  for (const path of changed) {
    if (!allowedChange.test(path)) {
      fail('CHAR-018-SCOPE-FILE', path, 'changed', 'Issue #8 allowed path', 'Issue #8 §2/§19', 'Revert out-of-scope gameplay, dialogue, story, scene, source-package or other-character changes.')
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(`[${error.rule}] path=${error.path} actual=${JSON.stringify(error.actual)} expected=${JSON.stringify(error.expected)} source=${error.source} fix=${error.fix}`)
  }
  process.exitCode = 1
} else {
  console.log(`CHARACTER_ASSETS_OK rules=19 xingyu=5 qima=9 runtime_assets=${provenance.runtime_assets.length} source_entry_sha256=${provenance.source_entry_sha256} issue8_scope=${enforceIssue8Scope}`)
}
