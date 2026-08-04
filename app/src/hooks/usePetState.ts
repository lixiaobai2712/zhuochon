import { useEffect, useState } from 'react'
import type { PetStatePayload } from '../../shared/types'

export function usePetState() {
  const [state, setState] = useState<PetStatePayload | null>(null)

  useEffect(() => {
    let on = true
    window.api.getState().then((s) => {
      if (on) setState(s)
    })
    const off = window.api.onState((s) => setState(s))
    return () => {
      on = false
      off()
    }
  }, [])

  return state
}
