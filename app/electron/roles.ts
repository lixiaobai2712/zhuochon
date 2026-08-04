import fs from 'node:fs'
import path from 'node:path'
import { getPaths } from './paths'
import type { PetAction, RoleInfo } from '../shared/types'

export const ALL_ACTIONS: PetAction[] = [
  'idle',
  'codex-working',
  'claude-working',
  'sleep',
  'click',
  'confirm-option',
  'success',
  'error',
]

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

// 动作 -> 文件名关键词（支持中英文）。用于没有 pet.config.json 时的自动匹配。
const KEYWORDS: Record<PetAction, string[]> = {
  idle: ['idle', '思考', '等待', '待机'],
  'codex-working': ['codex', 'working', '开始执行', '执行'],
  'claude-working': ['claude', 'working', '开始执行', '执行'],
  sleep: ['sleep', '睡觉', 'zzz', '睡眠'],
  click: ['click', '点击', 'touch', '触摸'],
  'confirm-option': ['confirm', 'permission', 'approval', 'option', '确认', '权限', '选项'],
  success: ['success', '完成', 'done', 'ok', '成功'],
  error: ['error', '失败', 'fail', '错误'],
}

// 动画类动作优先选 gif
const ANIMATED: PetAction[] = ['idle', 'codex-working', 'claude-working', 'sleep', 'click']

function listImages(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
  } catch {
    return []
  }
}

function buildRole(dir: string, idFallback: string, nameFallback: string): RoleInfo {
  const cfgPath = path.join(dir, 'pet.config.json')
  let id = idFallback
  let name = nameFallback
  let actionsMap: Partial<Record<PetAction, string | string[]>> = {}

  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
      if (cfg.id) id = String(cfg.id)
      if (cfg.name) name = String(cfg.name)
      if (cfg.actions) actionsMap = cfg.actions
    } catch (e) {
      console.warn('[roles] bad pet.config.json', cfgPath, e)
    }
  }

  const images = listImages(dir)
  const actions: Partial<Record<PetAction, string[]>> = {}

  for (const act of ALL_ACTIONS) {
    const configured = actionsMap[act]
    const configuredFiles = Array.isArray(configured)
      ? configured.filter((f) => images.includes(f))
      : configured && images.includes(configured)
        ? [configured]
        : []
    if (configuredFiles.length) {
      actions[act] = configuredFiles
      continue
    }
    const kws = [...(KEYWORDS[act] || []), act]
    const cands = images.filter((f) =>
      kws.some((k) => f.toLowerCase().includes(k.toLowerCase())),
    )
    if (cands.length) {
      if (ANIMATED.includes(act)) {
        const gifs = cands.filter((f) => path.extname(f).toLowerCase() === '.gif')
        actions[act] = gifs.length ? gifs : cands
      } else {
        actions[act] = cands
      }
      continue
    }
    // 缺少该动作时回退到 idle 卡池
    if (actions.idle) actions[act] = actions.idle
  }

  return { id, name, folder: dir, actions }
}

function scan(root: string, out: RoleInfo[]) {
  if (!root || !fs.existsSync(root)) return
  const entries = fs.readdirSync(root, { withFileTypes: true })
  const hasImagesDirectly =
    listImages(root).length > 0 || fs.existsSync(path.join(root, 'pet.config.json'))

  if (hasImagesDirectly) {
    // 根目录本身就是角色（例如 图片/角色 直接放素材）
    out.push(buildRole(root, 'custom-1', '自定义1'))
    return
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const sub = path.join(root, e.name)
    if (listImages(sub).length > 0 || fs.existsSync(path.join(sub, 'pet.config.json'))) {
      out.push(buildRole(sub, e.name, e.name))
    }
  }
}

let cached: RoleInfo[] = []

export function loadRoles(): RoleInfo[] {
  const { roleRoots } = getPaths()
  const out: RoleInfo[] = []
  for (const root of roleRoots) scan(root, out)
  // 按文件夹去重
  const seen = new Set<string>()
  cached = out.filter((r) => {
    const key = path.resolve(r.folder).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return cached
}

export function getRoles(): RoleInfo[] {
  if (!cached.length) cached = loadRoles()
  return cached
}

export function reloadRoles(): RoleInfo[] {
  cached = loadRoles()
  return cached
}

export function resolveRole(id: string): RoleInfo {
  const roles = getRoles()
  return (
    roles.find((r) => r.id === id) ||
    roles[0] || {
      id: 'none',
      name: '未找到角色',
      folder: '',
      actions: {},
    }
  )
}
