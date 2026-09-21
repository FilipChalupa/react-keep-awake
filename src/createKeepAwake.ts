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
 */
export const createKeepAwake = (
	strategy: KeepAwakeStrategy = screenWakeLockStrategy,
): KeepAwakeInstance => {
	let claims = 0
	let deactivate: (() => void) | null = null
	let isSupported: boolean | null = null
	let state: KeepAwakeState = {
		isSupported: false,
		isActive: false,
		error: null,
	}
	const listeners = new Set<(state: KeepAwakeState) => void>()

	// Consulted lazily so a strategy may look at globals that do not exist
	// while a page is being rendered on a server.
	const getIsSupported = () => {
		if (isSupported === null) {
			isSupported = strategy.isSupported()
		}
		return isSupported
	}

	const setState = (change: Partial<KeepAwakeState>) => {
		const nextState = { ...state, ...change, isSupported: getIsSupported() }
		if (
			nextState.isActive === state.isActive &&
			nextState.error === state.error &&
			nextState.isSupported === state.isSupported
		) {
			return
		}
		state = nextState
		// A snapshot, so a listener unsubscribing while being told does
		// not disturb the walk.
		for (const listener of Array.from(listeners)) {
			listener(state)
		}
	}

	return {
		request: () => {
			claims++
			if (claims === 1) {
				deactivate = strategy.activate({
					onActiveChange: (isActive) => {
						setState({ isActive })
					},
					onError: (error) => {
						setState({ error, isActive: false })
					},
				})
			}

			let isGivenUp = false

			return () => {
				if (isGivenUp) {
					return
				}
				isGivenUp = true
				claims--
				if (claims === 0) {
					deactivate?.()
					deactivate = null
					setState({ isActive: false })
				}
			}
		},
		getState: () => {
			// The first read is also what settles whether the strategy is
			// supported, so a consumer that never asks for the screen still
			// learns it could not have had it.
			setState({})
			return state
		},
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}
