import { useSettings } from '../hooks/useSettings'
import type { Settings } from '../../shared/types'

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const SCALE_STEP = 0.1

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))))
}

export default function HoverToolbar() {
  const { settings, update } = useSettings()
  if (!settings) return null

  const items: { key: keyof Settings; icon: string; title: string }[] = [
    { key: 'alwaysOnTop', icon: settings.alwaysOnTop ? 'T' : 't', title: '置顶' },
    { key: 'draggable', icon: settings.draggable ? 'D' : 'd', title: '拖拽' },
    { key: 'speechBubble', icon: settings.speechBubble ? 'B' : 'b', title: '气泡' },
    { key: 'autoDetectActivity', icon: settings.autoDetectActivity ? 'A' : 'a', title: '自动检测' },
  ]

  return (
    <div
      className="hover-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it) => (
        <button
          key={it.key}
          title={it.title}
          onClick={() => update({ [it.key]: !settings[it.key] } as Partial<Settings>)}
        >
          {it.icon}
        </button>
      ))}
      <button title="缩小" onClick={() => update({ scale: clampScale(settings.scale - SCALE_STEP) })}>
        -
      </button>
      <button title="恢复默认大小" onClick={() => update({ scale: 1 })}>
        1:1
      </button>
      <button title="放大" onClick={() => update({ scale: clampScale(settings.scale + SCALE_STEP) })}>
        +
      </button>
      <button title="随机美图" onClick={() => window.api.galleryRequest()}>
        G
      </button>
      <button title="退出" onClick={() => window.api.quit()}>
        Q
      </button>
    </div>
  )
}
