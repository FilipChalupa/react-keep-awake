import { useEffect, useState } from 'react'
import { useKeepAwakeInstance } from './KeepAwakeProvider'
import type { KeepAwakeState } from './KeepAwakeStrategy'

/**
 * Keeps the screen awake while `active`, and reports whether that is
 * actually happening — a screen wake lock is unavailable in more places
 * than it is available, WebViews among them, and silence is easy to
 * mistake for success.
 */
export const useKeepAwake = (active = true): KeepAwakeState => {
	const keepAwake = useKeepAwakeInstance()
	const [state, setState] = useState<KeepAwakeState>(() =>
		keepAwake.getState(),
	)

	useEffect(() => {
		// Whatever happened between rendering and subscribing.
		setState(keepAwake.getState())
		return keepAwake.subscribe(setState)
	}, [keepAwake])

	useEffect(() => {
		if (!active) {
			return
		}
		return keepAwake.request()
	}, [active, keepAwake])

	return state
}
