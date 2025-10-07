import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputDir = path.join(rootDir, 'public', 'licenses')
const pkgJsonPath = path.join(rootDir, 'package.json')

const licenseNames = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENSE-MIT',
  'LICENCE',
  'LICENCE.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt'
]

const noticeNames = ['NOTICE', 'NOTICE.md', 'NOTICE.txt']

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function removeDir(dir) {
  await fs.rm(dir, { recursive: true, force: true })
}

async function findFirstCaseInsensitive(dirEntries, candidates) {
  const lowerEntries = new Map(dirEntries.map((entry) => [entry.toLowerCase(), entry]))
  for (const candidate of candidates) {
    const match = lowerEntries.get(candidate.toLowerCase())
    if (match) {
      return match
    }
  }
  return null
}

async function readPackageList() {
  const raw = await fs.readFile(pkgJsonPath, 'utf8')
  const pkg = JSON.parse(raw)
  return Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) })
}

async function loadLicenseArtifacts(pkgName) {
  let pkgJsonFile
  try {
    pkgJsonFile = require.resolve(path.join(pkgName, 'package.json'))
  } catch (err) {
    // fall back to manual path inside node_modules (handles packages without exports stubs)
    const manualPath = path.join(rootDir, 'node_modules', ...pkgName.split('/'), 'package.json')
    try {
      const stat = await fs.stat(manualPath)
      if (stat.isFile()) {
        pkgJsonFile = manualPath
      }
    } catch (innerErr) {
      console.warn(`[licenses] skipped ${pkgName}: ${innerErr.message}`)
      return null
    }
  }

  const pkgDir = path.dirname(pkgJsonFile)
  const pkgMeta = JSON.parse(await fs.readFile(pkgJsonFile, 'utf8'))
  let dirEntries = []
  try {
    dirEntries = await fs.readdir(pkgDir)
  } catch (err) {
    console.warn(`[licenses] could not read directory for ${pkgName}: ${err.message}`)
  }

  const licenseEntry = await findFirstCaseInsensitive(dirEntries, licenseNames)
  const noticeEntry = await findFirstCaseInsensitive(dirEntries, noticeNames)

  const licensePath = licenseEntry ? path.join(pkgDir, licenseEntry) : null
  const noticePath = noticeEntry ? path.join(pkgDir, noticeEntry) : null

  const licenseText = licensePath ? await fs.readFile(licensePath, 'utf8') : ''
  const noticeText = noticePath ? await fs.readFile(noticePath, 'utf8') : ''

  return {
    name: pkgName,
    version: pkgMeta.version || 'unknown',
    declaredLicense: pkgMeta.license || 'UNKNOWN',
    licenseText,
    noticeText
  }
}

async function writeLicenseFile(info) {
  if (!info) return
  const fileName = info.name.replace(/[\\/]/g, '__') + '.txt'
  const contentParts = [
    `Package: ${info.name}`,
    `Version: ${info.version}`,
    `Declared license: ${info.declaredLicense}`
  ]
  if (info.licenseText.trim()) {
    contentParts.push('\n----- LICENSE TEXT -----\n' + info.licenseText.trim())
  } else {
    contentParts.push('\n----- LICENSE TEXT -----\n(No license file found in package directory.)')
  }
  if (info.noticeText.trim()) {
    contentParts.push('\n----- NOTICE -----\n' + info.noticeText.trim())
  }
  const outputPath = path.join(outputDir, fileName)
  await fs.writeFile(outputPath, contentParts.join('\n') + '\n', 'utf8')
}

async function main() {
  const packageNames = await readPackageList()
  await removeDir(outputDir)
  await ensureDir(outputDir)
  const seen = new Set()
  for (const name of packageNames) {
    if (seen.has(name)) continue
    seen.add(name)
    const info = await loadLicenseArtifacts(name)
    await writeLicenseFile(info)
  }
  console.log(`[licenses] Copied license data for ${seen.size} packages to public/licenses/`)
}

main().catch((err) => {
  console.error('[licenses] Failed to copy licenses', err)
  process.exitCode = 1
})
