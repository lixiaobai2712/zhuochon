import { app, ipcMain, protocol } from 'electron'
import { registerPetFileProtocol } from './protocol'
import { settingsStore } from './settings'
import { createPetWindow, getPetWindow, applyPetWindowSettings } from './window'
import { initTray, destroyTray, hasTray, refreshTray } from './tray'
import { stateManager } from './state'
import { activityWatcher } from './activity-detector'
import { openGallery, requestGallery, pickRandomImage, closeGallery } from './gallery'
import { broadcastSettings, broadcastState } from './broadcast'
import { loadRoles } from './roles'
import type { Settings } from '../shared/types'

// 自定义协议必须先于 ready 注册
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'petfile',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true },
  },
])

/** 统一应用设置：窗口、托盘、开机自启、渲染进程同步、托盘菜单刷新 */
function applySettings() {
  const s = settingsStore.get()

  applyPetWindowSettings(s)

  if (s.tray && !hasTray()) initTray({ applySettings })
  else if (!s.tray && hasTray()) destroyTray()

  app.setLoginItemSettings({ openAtLogin: s.launchAtStartup })

  broadcastSettings(s)
  broadcastState(stateManager.current())
  refreshTray()
}

function registerIpc() {
  ipcMain.handle('settings:get', () => settingsStore.get())
  ipcMain.handle('settings:update', (_e, patch: Partial<Settings>) => {
    settingsStore.update(patch)
    applySettings()
    return settingsStore.get()
  })
  ipcMain.handle('pet:get-state', () => stateManager.current())
  ipcMain.on('pet:set-manual', (_e, a: Settings['manualState']) => {
    settingsStore.update({ manualState: a })
    applySettings()
  })
  ipcMain.on('pet:click', () => {
    const s = settingsStore.get()
    if (!s.clickInteraction) return
    activityWatcher.poke()
    stateManager.setTemporary('click', 1600)
  })
  ipcMain.on('gallery:request', () => void requestGallery())
  ipcMain.handle('gallery:next', () => pickRandomImage())
  ipcMain.on('gallery:close', () => closeGallery())
  ipcMain.on('pet:drag', (_e, p: { x: number; y: number }) => {
    const w = getPetWindow()
    if (!w) return
    w.setPosition(Math.round(p.x), Math.round(p.y), false)
  })
  ipcMain.on('app:quit', () => app.quit())
}

function appReady() {
  registerPetFileProtocol()

  // 加载角色，并确保默认角色有效
  const roles = loadRoles()
  const s = settingsStore.get()
  if (!s.roleId || !roles.some((r) => r.id === s.roleId)) {
    settingsStore.update({ roleId: roles[0]?.id || '' })
  }

  registerIpc()

  createPetWindow()
  stateManager.subscribe(broadcastState)

  if (settingsStore.get().tray) initTray({ applySettings })

  activityWatcher.start()

  broadcastSettings(settingsStore.get())
  broadcastState(stateManager.current())
}

// 单实例锁：避免重复打开
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const w = getPetWindow()
    if (w) {
      w.show()
      w.focus()
    }
  })

  app.whenReady().then(() => {
    settingsStore.init()
    appReady()
  })

  // 关闭所有窗口时继续驻留托盘
  app.on('window-all-closed', () => {
    /* 常驻 */
  })

  app.on('before-quit', () => {
    activityWatcher.stop()
  })

  app.on('activate', () => {
    const w = getPetWindow()
    if (w) w.show()
  })
}
