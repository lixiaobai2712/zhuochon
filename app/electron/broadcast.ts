import { BrowserWindow } from 'electron'
import type { PetStatePayload, Settings } from '../shared/types'

let petWindowGetter: () => BrowserWindow | null = () => null

export function setPetWindowGetter(fn: () => BrowserWindow | null) {
  petWindowGetter = fn
}

export function broadcastSettings(s: Settings) {
  const w = petWindowGetter()
  if (w && !w.isDestroyed()) w.webContents.send('settings:update-event', s)
}

export function broadcastState(p: PetStatePayload) {
  const w = petWindowGetter()
  if (w && !w.isDestroyed()) w.webContents.send('pet:state', p)
}
