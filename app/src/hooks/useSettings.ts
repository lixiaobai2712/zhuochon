import { useEffect, useState } from 'react'
import type { Settings } from '../../shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let on = true
    window.api.getSettings().then((s) => {
      if (on) setSettings(s)
    })
    const off = window.api.onSettings((s) => setSettings(s))
    return () => {
      on = false
      off()
    }
  }, [])

  const update = (patch: Partial<Settings>) =>
    window.api.updateSettings(patch).then(setSettings)

  return { settings, update }
}
