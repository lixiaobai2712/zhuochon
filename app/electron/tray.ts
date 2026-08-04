import { app, Menu, Tray, nativeImage } from 'electron'
import path from 'node:path'
import { settingsStore } from './settings'
import { getRoles, reloadRoles } from './roles'
import { getPetWindow } from './window'
import { openGallery } from './gallery'
import type { PetAction, Settings } from '../shared/types'

const ACTIONS: { value: PetAction; label: string }[] = [
  { value: 'idle', label: '待机' },
  { value: 'codex-working', label: 'Codex 工作中' },
  { value: 'claude-working', label: 'Claude 工作中' },
  { value: 'sleep', label: '睡眠' },
  { value: 'success', label: '任务完成' },
  { value: 'error', label: '失败' },
]

let tray: Tray | null = null
let applySettings: () => void = () => {}

export function initTray(h: { applySettings: () => void }) {
  applySettings = h.applySettings
  if (tray) return
  const iconPath = process.env.PET_ICON || path.join(app.getAppPath(), 'resources', 'icon.png')
  tray = new Tray(nativeImage.createFromPath(iconPath))
  tray.setToolTip('桌面小宠')
  refreshTray()
}

export function hasTray() {
  return !!tray
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}

function toggle(key: keyof Settings, value: boolean) {
  settingsStore.update({ [key]: value } as Partial<Settings>)
  applySettings()
}

export function refreshTray() {
  if (!tray) return
  const s = settingsStore.get()
  const roles = getRoles()

  const menu = Menu.buildFromTemplate([
    {
      label: '显示 / 隐藏桌宠',
      click: () => {
        const w = getPetWindow()
        if (!w) return
        if (w.isVisible()) w.hide()
        else {
          w.show()
          w.focus()
        }
      },
    },
    {
      label: '切换角色',
      submenu: roles.map((r) => ({
        label: r.name,
        type: 'checkbox' as const,
        checked: s.roleId === r.id,
        click: () => {
          settingsStore.update({ roleId: r.id })
          applySettings()
        },
      })),
    },
    {
      label: '手动状态',
      submenu: [
        ...ACTIONS.map((a) => ({
          label: a.label,
          type: 'checkbox' as const,
          checked: s.manualState === a.value,
          click: () => {
            settingsStore.update({ manualState: a.value })
            applySettings()
          },
        })),
        { type: 'separator' },
        {
          label: '自动',
          type: 'checkbox' as const,
          checked: s.manualState === 'auto',
          click: () => {
            settingsStore.update({ manualState: 'auto' })
            applySettings()
          },
        },
      ],
    },
    { type: 'separator' },
    { label: '置顶', type: 'checkbox' as const, checked: s.alwaysOnTop, click: (i) => toggle('alwaysOnTop', i.checked) },
    { label: '可拖拽', type: 'checkbox' as const, checked: s.draggable, click: (i) => toggle('draggable', i.checked) },
    { label: '点击互动', type: 'checkbox' as const, checked: s.clickInteraction, click: (i) => toggle('clickInteraction', i.checked) },
    { label: '气泡', type: 'checkbox' as const, checked: s.speechBubble, click: (i) => toggle('speechBubble', i.checked) },
    { label: '自动检测 Codex / Claude', type: 'checkbox' as const, checked: s.autoDetectActivity, click: (i) => toggle('autoDetectActivity', i.checked) },
    { label: '开机自启', type: 'checkbox' as const, checked: s.launchAtStartup, click: (i) => toggle('launchAtStartup', i.checked) },
    { type: 'separator' },
    {
      label: '刷新角色列表',
      click: () => {
        reloadRoles()
        applySettings()
      },
    },
    { label: '随机美图', click: () => openGallery() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
}
