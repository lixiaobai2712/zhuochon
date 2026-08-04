import { useSettings } from '../hooks/useSettings'
import type { Settings } from '../../shared/types'

export default function HoverToolbar() {
  const { settings, update } = useSettings()
  if (!settings) return null

  const items: { key: keyof Settings; icon: string; title: string }[] = [
    { key: 'alwaysOnTop', icon: settings.alwaysOnTop ? '📌' : '🧷', title: '置顶' },
    { key: 'draggable', icon: settings.draggable ? '✋' : '🚫', title: '拖拽' },
    { key: 'speechBubble', icon: settings.speechBubble ? '💬' : '🔇', title: '气泡' },
    { key: 'autoDetectActivity', icon: settings.autoDetectActivity ? '🕵️' : '💤', title: '自动检测' },
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
      <button title="随机美图" onClick={() => window.api.galleryRequest()}>
        🖼️
      </button>
      <button title="退出" onClick={() => window.api.quit()}>
        ⏻
      </button>
    </div>
  )
}
