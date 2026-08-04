import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { usePetState } from '../hooks/usePetState'
import Bubble from './Bubble'
import HoverToolbar from './HoverToolbar'
import type { PetAction } from '../../shared/types'

const DRAG_THRESHOLD = 4
const CLICK_DELAY = 350 // 等待双击判断

const MESSAGES: Record<PetAction, string[]> = {
  idle: ['我在呢~', '陪你摸鱼中…', '要干点啥吗？', '今天也是元气满满！'],
  'codex-working': ['Codex 正在干活，稍等一下~', '任务执行中…', '代码马上好！'],
  'claude-working': ['Claude 正在写代码…', '稍等，我在琢磨…'],
  sleep: ['zzz…', '我先睡会儿…', '有事戳我一下哦'],
  click: ['嘿嘿，干嘛戳我呀', '我在呢！', '痒痒的~'],
  success: ['任务完成啦！', '搞定！', '漂亮！'],
  error: ['好像出错了…', '注意检查一下哦'],
}

export default function Pet() {
  const { settings } = useSettings()
  const state = usePetState()
  const [hover, setHover] = useState(false)
  const [bubble, setBubble] = useState<{ text: string; key: number } | null>(null)

  const dragRef = useRef({ startX: 0, startY: 0, winX: 0, winY: 0, dragging: false })
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moved = useRef(false)

  const scale = settings?.scale ?? 1
  const size = 220 * scale
  const draggable = settings?.draggable !== false

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current)
    },
    [],
  )

  // 状态变化时冒一个气泡
  useEffect(() => {
    if (!state || settings?.speechBubble === false) return
    const msgs = MESSAGES[state.action] || ['…']
    const text = msgs[Math.floor(Math.random() * msgs.length)]
    setBubble({ text, key: Date.now() })
    const t = setTimeout(() => setBubble(null), 2600)
    return () => clearTimeout(t)
  }, [state?.action]) // eslint-disable-line react-hooks/exhaustive-deps

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || !draggable) return
    dragRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      winX: window.screenX,
      winY: window.screenY,
      dragging: false,
    }
    moved.current = false
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e: PointerEvent) {
    const d = dragRef.current
    if (!d.dragging) {
      const dx = e.screenX - d.startX
      const dy = e.screenY - d.startY
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        d.dragging = true
        moved.current = true
        if (clickTimer.current) {
          clearTimeout(clickTimer.current)
          clickTimer.current = null
        }
      }
    }
    if (d.dragging) {
      window.api.dragMove(d.winX + (e.screenX - d.startX), d.winY + (e.screenY - d.startY))
    }
  }

  function onPointerUp() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  function handleClick() {
    if (moved.current) return
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => window.api.petClick(), CLICK_DELAY)
  }

  function handleDoubleClick() {
    if (moved.current) return
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    window.api.galleryRequest()
  }

  return (
    <div
      className="pet"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={onPointerDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {state?.image ? (
        <img className="pet-image" src={state.image} draggable={false} alt="" />
      ) : (
        <div className="pet-fallback">🐱</div>
      )}
      {bubble && settings?.speechBubble !== false && <Bubble text={bubble.text} key={bubble.key} />}
      {hover && <HoverToolbar />}
    </div>
  )
}
