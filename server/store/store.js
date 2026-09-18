import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 优先使用 Electron userData 目录（打包后），否则使用开发环境路径
const STORE_DIR = process.env.ELECTRON_USER_DATA
  ? join(process.env.ELECTRON_USER_DATA, 'store')
  : join(__dirname, '..', 'store')

const PRESETS_FILE = join(STORE_DIR, 'presets.json')
const MODELS_FILE = join(STORE_DIR, 'models.json')
const CONFIG_FILE = join(STORE_DIR, 'config.json')

const defaultPresets = [
  {
    id: 'perf-max',
    name: '性能优先',
    params: {
      ngl: 99, ctx: 32768, t: 16, port: 8880, host: '0.0.0.0',
      timeout: 120, parallel: 1, batchSize: 2048, ubatchSize: 512,
      contBatching: true, jinja: true,
    },
  },
  {
    id: 'mem-saver',
    name: '省内存',
    params: {
      ngl: 12, ctx: 8192, t: 4, port: 8880, host: '0.0.0.0',
      timeout: 120, parallel: 1, batchSize: 512, ubatchSize: 256,
      contBatching: true, jinja: true,
    },
  },
]

function ensureStore() {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true })
  if (!existsSync(PRESETS_FILE)) writeFileSync(PRESETS_FILE, JSON.stringify(defaultPresets, null, 2))
  if (!existsSync(MODELS_FILE)) writeFileSync(MODELS_FILE, JSON.stringify({}, null, 2))
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function getPresets() {
  ensureStore()
  return readJSON(PRESETS_FILE)
}

export function savePresets(presets) {
  ensureStore()
  writeJSON(PRESETS_FILE, presets)
}

export function getModelConfigs() {
  ensureStore()
  return readJSON(MODELS_FILE)
}

export function getModelConfig(modelName) {
  const configs = getModelConfigs()
  return configs[modelName] || null
}

export function saveModelConfig(modelName, config) {
  const configs = getModelConfigs()
  configs[modelName] = config
  writeJSON(MODELS_FILE, configs)
}

const defaultConfig = {
  modelsDir: 'models',
}

export function getConfig() {
  ensureStore()
  if (!existsSync(CONFIG_FILE)) writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2))
  return readJSON(CONFIG_FILE)
}

export function saveConfig(data) {
  ensureStore()
  const config = getConfig()
  Object.assign(config, data)
  writeJSON(CONFIG_FILE, config)
}
