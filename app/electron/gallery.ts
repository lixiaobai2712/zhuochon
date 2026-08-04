import { BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { getPaths } from './paths'
import { toPetFileUrl } from './protocol'
import { activityWatcher } from './activity-detector'
import type { GalleryResult } from '../shared/types'

const EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
let galleryWin: BrowserWindow | null = null

export function listGalleryImages(): string[] {
  const { galleryRoot } = getPaths()
  try {
    return fs
      .readdirSync(galleryRoot)
      .filter((f) => EXT.includes(path.extname(f).toLowerCase()))
  } catch {
    return []
  }
}

export function pickRandomImage(): GalleryResult {
  const files = listGalleryImages()
  if (!files.length) return { url: '', name: '', empty: true, count: 0 }
  const file = files[Math.floor(Math.random() * files.length)]
  const { galleryRoot } = getPaths()
  return {
    url: toPetFileUrl(path.join(galleryRoot, file)),
    name: file,
    empty: false,
    count: files.length,
  }
}

export function openGallery() {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.show()
    galleryWin.focus()
    return
  }
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  galleryWin = new BrowserWindow({
    width: 560,
    height: 620,
    frame: false,
    backgroundColor: '#10121a',
    alwaysOnTop: true,
    resizable: true,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (devUrl) {
    void galleryWin.loadURL(devUrl + '?view=gallery')
  } else {
    void galleryWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { view: 'gallery' },
    })
  }
  galleryWin.once('ready-to-show', () => galleryWin?.show())
  galleryWin.on('closed', () => {
    galleryWin = null
  })
}

export async function requestGallery() {
  // 打开图库也算一次活动，避免触发睡眠
  activityWatcher.poke()
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: '桌宠',
    message: '来一张好看的图片？',
    buttons: ['好啊', '算了'],
    defaultId: 0,
    cancelId: 1,
  })
  if (response === 0) openGallery()
}

export function closeGallery() {
  if (galleryWin && !galleryWin.isDestroyed()) galleryWin.close()
}
