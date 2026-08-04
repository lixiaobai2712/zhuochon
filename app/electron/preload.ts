import { contextBridge, ipcRenderer } from 'electron'
import type { Api, PetStatePayload, Settings } from '../shared/types'

const api: Api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:update', patch),
  onSettings: (cb: (s: Settings) => void) => {
    const l = (_: unknown, s: Settings) => cb(s)
    ipcRenderer.on('settings:update-event', l)
    return () => ipcRenderer.removeListener('settings:update-event', l)
  },
  getState: () => ipcRenderer.invoke('pet:get-state'),
  setManualState: (a) => ipcRenderer.send('pet:set-manual', a),
  onState: (cb: (s: PetStatePayload) => void) => {
    const l = (_: unknown, s: PetStatePayload) => cb(s)
    ipcRenderer.on('pet:state', l)
    return () => ipcRenderer.removeListener('pet:state', l)
  },
  petClick: () => ipcRenderer.send('pet:click'),
  galleryRequest: () => ipcRenderer.send('gallery:request'),
  galleryNext: () => ipcRenderer.invoke('gallery:next'),
  closeGallery: () => ipcRenderer.send('gallery:close'),
  dragMove: (x, y) => ipcRenderer.send('pet:drag', { x, y }),
  quit: () => ipcRenderer.send('app:quit'),
}

contextBridge.exposeInMainWorld('api', api)
