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
    const file = role.actions[action]
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
    this.emit()
  }

  /** 临时状态（点击、success/error 预览），到时自动回到上一个状态 */
  setTemporary(a: PetAction, ms: number) {
    this.prevAction = this.action
    this.action = a
    if (this.tempTimer) clearTimeout(this.tempTimer)
    this.tempTimer = setTimeout(() => {
      this.tempTimer = null
      this.action = this.prevAction
      this.emit()
    }, ms)
    this.emit()
  }

  emit() {
    const p = this.current()
    for (const fn of this.listeners) fn(p)
  }
}

export const stateManager = new StateManager()
