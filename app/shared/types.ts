// 主进程 / preload / 渲染进程共享的类型（纯类型，无运行时依赖）
export type PetAction =
  | 'idle'
  | 'codex-working'
  | 'claude-working'
  | 'sleep'
  | 'click'
  | 'success'
  | 'error'

export interface Settings {
  roleId: string
  /** 手动状态；'auto' 表示交给自动检测 */
  manualState: PetAction | 'auto'
  /** 缩放比例，1 为默认 220x220 */
  scale: number
  alwaysOnTop: boolean
  draggable: boolean
  clickInteraction: boolean
  speechBubble: boolean
  tray: boolean
  autoDetectActivity: boolean
  launchAtStartup: boolean
  windowBounds?: { x: number; y: number }
}

export interface PetStatePayload {
  action: PetAction
  /** 当前动作对应的图片 URL（petfile://），可能为 null（无素材） */
  image: string | null
  roleName: string
  roleId: string
  scale: number
  manual: boolean
}

export interface RoleInfo {
  id: string
  name: string
  folder: string
  /** action -> 文件名 */
  actions: Partial<Record<PetAction, string>>
}

export interface GalleryResult {
  url: string
  name: string
  empty: boolean
  count: number
}

/** preload 通过 contextBridge 暴露给渲染进程的 API */
export interface Api {
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  onSettings(cb: (s: Settings) => void): () => void
  getState(): Promise<PetStatePayload>
  setManualState(a: PetAction | 'auto'): void
  onState(cb: (s: PetStatePayload) => void): () => void
  petClick(): void
  galleryRequest(): void
  galleryNext(): Promise<GalleryResult>
  closeGallery(): void
  dragMove(x: number, y: number): void
  quit(): void
}
