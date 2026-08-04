import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { settingsStore } from './settings'
import { setPetWindowGetter } from './broadcast'

const BASE = 220

export function petWindowSize(scale: number) {
  return { width: Math.round(BASE * scale), height: Math.round(BASE * scale) }
}

let petWin: BrowserWindow | null = null

export function getPetWindow() {
  return petWin
}

function isVisibleOnScreen(x: number, y: number, w: number, h: number): boolean {
  const cx = Math.round(x + w / 2)
  const cy = Math.round(y + h / 2)
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea
    return cx >= a.x && cx <= a.x + a.width && cy >= a.y && cy <= a.y + a.height
  })
}

export function createPetWindow(): BrowserWindow {
  const s = settingsStore.get()
  const { width, height } = petWindowSize(s.scale)

  petWin = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: s.alwaysOnTop,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (s.alwaysOnTop) petWin.setAlwaysOnTop(true, 'screen-saver')

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void petWin.loadURL(devUrl)
  } else {
    void petWin.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 恢复上次位置；若已在屏幕外则保持默认（Electron 会放到居中位置）
  const { windowBounds } = settingsStore.get()
  if (windowBounds && isVisibleOnScreen(windowBounds.x, windowBounds.y, width, height)) {
    petWin.setPosition(windowBounds.x, windowBounds.y, false)
  }

  petWin.once('ready-to-show', () => petWin?.show())

  let lastSave = 0
  petWin.on('moved', () => {
    if (!petWin) return
    const [x, y] = petWin.getPosition()
    const now = Date.now()
    if (now - lastSave > 500) {
      lastSave = now
      settingsStore.update({ windowBounds: { x, y } })
    }
  })

  petWin.on('closed', () => {
    petWin = null
  })

  setPetWindowGetter(() => petWin)
  return petWin
}

export function applyPetWindowSettings(s = settingsStore.get()) {
  if (!petWin || petWin.isDestroyed()) return
  const { width, height } = petWindowSize(s.scale)
  const [x, y] = petWin.getPosition()
  petWin.setBounds({ x, y, width, height })
  petWin.setAlwaysOnTop(s.alwaysOnTop, s.alwaysOnTop ? 'screen-saver' : 'normal')
}
