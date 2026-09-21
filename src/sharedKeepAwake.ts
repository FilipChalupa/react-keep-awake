import { createKeepAwake, type KeepAwakeInstance } from './createKeepAwake'
import type { KeepAwakeStrategy } from './KeepAwakeStrategy'
import { screenWakeLockStrategy } from './screenWakeLockStrategy'

let strategy: KeepAwakeStrategy = screenWakeLockStrategy
let sharedKeepAwake: KeepAwakeInstance | null = null

/**
 * Chooses how `useKeepAwake` and `KeepAwake` keep the screen awake, for an
 * app that cannot use the Screen Wake Lock API — one living inside a native
 * shell, say, where the shell has to be asked instead.
 *
 * Call it while the app starts. Claims are counted per instance, so the
 * strategy can no longer be swapped once something has asked for the screen.
 */
export const setKeepAwakeStrategy = (nextStrategy: KeepAwakeStrategy) => {
	if (sharedKeepAwake) {
		throw new Error(
			'react-keep-awake: the strategy is already in use. Set it before the first component asks to keep the screen awake.',
		)
	}
	strategy = nextStrategy
}

/**
 * The instance behind the hook, built on first use so that merely importing
 * this package neither touches browser globals nor settles the strategy
 * before the app has had its say.
 */
export const getSharedKeepAwake = (): KeepAwakeInstance => {
	if (!sharedKeepAwake) {
		sharedKeepAwake = createKeepAwake(strategy)
	}
	return sharedKeepAwake
}

/** Test seam: forgets the instance and the chosen strategy. */
export const resetSharedKeepAwake = () => {
	sharedKeepAwake = null
	strategy = screenWakeLockStrategy
}
