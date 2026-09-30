import { Router } from 'express'
import { processManager } from '../services/process-manager.js'
import { scanPorts } from '../services/port-scanner.js'

const router = Router()

const PORT_RANGE_START = 8880
const PORT_RANGE_END = 8890
const DEFAULT_PORT = 8880

// 启动一个实例：成功返回 instanceId，前端据此激活对应 Tab
router.post('/start', async (req, res) => {
  const { modelPath, modelName, params } = req.body || {}
  if (!modelPath || !modelName) {
    return res.status(400).json({ error: 'modelPath and modelName required' })
  }
  // 非法端口必须就地拒绝：否则会拼出 --port 99999 之类的参数，
  // 实例只能在 starting 卡满 60 次健康检查后才报「启动超时」
  const port = Number(params?.port ?? DEFAULT_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return res.status(400).json({ error: `invalid port: ${params?.port}` })
  }
  try {
    const instanceId = await processManager.start({ modelPath, modelName, params })
    res.json({ ok: true, instanceId })
  } catch (err) {
    // 端口守卫命中：前端据此就地提示，不再走 alert 全局弹窗
    if (err?.code === 'PORT_IN_USE') {
      return res.status(409).json({
        code: 'PORT_IN_USE',
        error: `端口 ${err.port} 已被实例/外部进程占用`,
        port: err.port,
        owner: err.owner,
      })
    }
    res.status(500).json({ error: err.message })
  }
})

// 停止：body 带 instanceId 只停该实例；省略则全部停止
router.post('/stop', async (req, res) => {
  const instanceId = req.body?.instanceId || null
  if (instanceId && !processManager.getInstance(instanceId)) {
    return res.status(404).json({ error: 'instance not found' })
  }
  await processManager.stop(instanceId)
  res.json({ ok: true, instanceId })
})

// 退出前全停：供前端 / electron before-quit 调用
router.post('/stop-all', async (req, res) => {
  await processManager.stopAll()
  res.json({ ok: true })
})

router.get('/status', (req, res) => {
  res.json({ instances: processManager.getInstances() })
})

// 空闲端口：8880–8890 取首个既未被我方实例占用、也无外部进程监听的端口
router.get('/ports/free', async (req, res) => {
  const busy = new Set()
  for (const instance of processManager.getInstances()) {
    // 与 assertPortFree / findByPort 一致：terminal 态实例已释放端口
    if (instance.state !== 'running' && instance.state !== 'starting') continue
    const port = Number(instance?.port)
    if (Number.isInteger(port) && port > 0) busy.add(port)
  }
  try {
    const external = await scanPorts(PORT_RANGE_START, PORT_RANGE_END)
    for (const item of external || []) busy.add(Number(item.port))
  } catch {
    // 扫描失败（netstat 不可用等）不阻塞：退化为只避开我方实例已占用的端口
  }

  let port = null
  for (let candidate = PORT_RANGE_START; candidate <= PORT_RANGE_END; candidate += 1) {
    if (!busy.has(candidate)) {
      port = candidate
      break
    }
  }

  res.json({ port: port ?? DEFAULT_PORT })
})

router.get('/scan', async (req, res) => {
  const found = await scanPorts()
  res.json(found)
})

export default router
