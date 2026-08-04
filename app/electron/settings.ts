import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Settings } from '../shared/types'

// 说明：与计划书用 electron-store 不同，这里手写了一个极简 JSON 存储。
// 效果一致（保存/恢复设置），但少一个依赖，避免 electron-store v9 的 ESM/CJS 兼容问题。
export const DEFAULT_SETTINGS: Settings = {
  roleId: '',
  manualState: 'auto',
  scale: 1,
  alwaysOnTop: true,
  draggable: true,
  clickInteraction: true,
  speechBubble: true,
  tray: true,
  autoDetectActivity: true,
  // 首次启动默认不强制注册开机自启，只提供开关，避免意外。
  launchAtStartup: false,
}

class SettingsStore {
  private file = ''
  private data: Settings = { ...DEFAULT_SETTINGS }

  init() {
    this.file = path.join(app.getPath('userData'), 'settings.json')
    try {
      const raw = fs.readFileSync(this.file, 'utf-8')
      this.data = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {
      /* 首次运行或文件损坏，使用默认值 */
    }
  }

  get(): Settings {
    return { ...this.data }
  }

  update(patch: Partial<Settings>): Settings {
    this.data = { ...this.data, ...patch }
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
    } catch (e) {
      console.error('[settings] write failed', e)
    }
    return this.get()
  }
}

export const settingsStore = new SettingsStore()
