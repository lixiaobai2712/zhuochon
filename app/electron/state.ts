import path from 'node:path'
import { resolveRole } from './roles'
import { settingsStore } from './settings'
import { toPetFileUrl } from './protocol'
import type { PetAction, PetStatePayload, Settings } from '../shared/types'

export type StateListener = (p: PetStatePayload) => void

class StateManager {
  private listeners: StateListener[] = []
  private action: PetAction = 'idle'
  private prevAction: PetAction = 'idle'
  private tempTimer: NodeJS.Timeout | null = null
  private selectedKey = ''
  private selectedFile: string | null = null

  subscribe(fn: StateListener): () => void {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn)
    }
  }

  current(): PetStatePayload {
    const s = settingsStore.get()
    const role = resolveRole(s.roleId)
    const action = this.currentAction(s)
    const pool = role.actions[action] || role.actions.idle || []
    const file = this.pickFile(`${role.id}:${action}:${pool.join('|')}`, pool)
    const image =
      role.folder && file ? toPetFileUrl(path.join(role.folder, file)) : null
    return {
      action,
      image,
      roleName: role.name,
      roleId: role.id,
      scale: s.scale,
      manual: s.manualState !== 'auto',
    }
  }

  /** 手动状态优先；否则关闭自动检测时回落到 idle；再否则取自动检测的结果 */
  currentAction(s: Settings = settingsStore.get()): PetAction {
    if (s.manualState !== 'auto') return s.manualState
    if (!s.autoDetectActivity) return 'idle'
    return this.action
  }

  setAction(a: PetAction) {
    if (this.action === a && !this.tempTimer) return
    this.action = a
    this.selectedKey = ''
    this.emit()
  }

  /** 临时状态（点击、success/error 预览），到时自动回到上一个状态 */
  setTemporary(a: PetAction, ms: number) {
    this.prevAction = this.action
    this.action = a
    this.selectedKey = ''
    if (this.tempTimer) clearTimeout(this.tempTimer)
    this.tempTimer = setTimeout(() => {
      this.tempTimer = null
      this.action = this.prevAction
      this.selectedKey = ''
      this.emit()
    }, ms)
    this.emit()
  }

  private pickFile(key: string, pool: string[]): string | null {
    if (!pool.length) return null
    if (this.selectedKey === key && this.selectedFile && pool.includes(this.selectedFile)) {
      return this.selectedFile
    }
    this.selectedKey = key
    this.selectedFile = pool[Math.floor(Math.random() * pool.length)]
    return this.selectedFile
  }

  emit() {
    const p = this.current()
    for (const fn of this.listeners) fn(p)
  }
}

export const stateManager = new StateManager()
