import { Router } from 'express'
import { getPresets, savePresets } from '../store/store.js'
import { randomUUID } from 'crypto'

const router = Router()

router.get('/', (req, res) => {
  res.json(getPresets())
})

router.post('/', (req, res) => {
  const presets = getPresets()
  const newPreset = { id: randomUUID(), ...req.body }
  presets.push(newPreset)
  savePresets(presets)
  res.json(newPreset)
})

router.put('/:id', (req, res) => {
  const presets = getPresets()
  const idx = presets.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Preset not found' })
  presets[idx] = { ...presets[idx], ...req.body, id: req.params.id }
  savePresets(presets)
  res.json(presets[idx])
})

router.delete('/:id', (req, res) => {
  let presets = getPresets()
  presets = presets.filter(p => p.id !== req.params.id)
  savePresets(presets)
  res.json({ ok: true })
})

export default router
