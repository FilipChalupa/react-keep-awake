import type { KeepAwakeState, KeepAwakeStrategy } from './KeepAwakeStrategy'
import { screenWakeLockStrategy } from './screenWakeLockStrategy'

export interface KeepAwakeInstance {
	/**
	 * Ask for the screen to stay awake. Returns a function that gives up this
	 * one claim; the strategy stops once every claim is given up.
	 */
	request: () => () => void
	getState: () => KeepAwakeState
	subscribe: (listener: (state: KeepAwakeState) => void) => () => void
}

/**
 * The claim counter behind the hook: the strategy is started for the first
 * claim and stopped after the last one, and whatever it reports in between
 * is passed on to subscribers.
 *
 * A strategy that throws is treated exactly like one that reports an error.
 * Keeping the screen awake is a comfort, never a reason to take down the app
 * asking for it.
 *
 * Whether the strategy is supported is settled here, once. Build the instance
 * where it can tell — `getSharedKeepAwake` waits until something asks for the
 * screen, which on a page rendered by a server is the browser.
 */
export const createKeepAwake = (
	strategy: KeepAwakeStrategy = screenWakeLockStrategy,
): KeepAwakeInstance => {
	let claims = 0
	let deactivate: (() => void) | null = null
	const listeners = new Set<(state: KeepAwakeState) => void>()

	// Nothing can be listening yet, so the first state is simply built.
	let isSupported = false
	let initialError: unknown = null
	try {
		isSupported = strategy.isSupported()
	} catch (error) {
		initialError = error
	}

	let state: KeepAwakeState = {
		isSupported,
		isActive: false,
		error: initialError,
	}

	const setState = (change: Partial<KeepAwakeState>) => {
		const nextState = { ...state, ...change }
		if (
			nextState.isActive === state.isActive &&
			nextState.error === state.error
		) {
			return
		}
		state = nextState
		// A snapshot, so a listener unsubscribing while being told does not
		// disturb the walk.
		for (const listener of Array.from(listeners)) {
			listener(state)
		}
	}

	return {
		request: () => {
			claims++
			// An unsupported strategy is never started, so it does not have to
			// guard against being asked for what it cannot do.
			if (claims === 1 && isSupported) {
				try {
					deactivate = strategy.activate({
						onActiveChange: (isActive) => {
							setState({ isActive })
						},
						onError: (error) => {
							setState({ error, isActive: false })
						},
					})
				} catch (error) {
					setState({ error, isActive: false })
				}
			}

			let isGivenUp = false

			return () => {
				if (isGivenUp) {
					return
				}
				isGivenUp = true
				claims--
				if (claims === 0) {
					const stop = deactivate
					deactivate = null
					if (stop) {
						try {
							stop()
						} catch (error) {
							setState({ error })
						}
					}
					// Said plainly, in case the strategy did not report it.
					setState({ isActive: false })
				}
			}
		},
		getState: () => state,
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}
