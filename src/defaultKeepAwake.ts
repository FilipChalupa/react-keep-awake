import { createKeepAwake, type KeepAwakeInstance } from './createKeepAwake'
import type { KeepAwakeStrategy } from './KeepAwakeStrategy'
import { screenWakeLockStrategy } from './screenWakeLockStrategy'

let defaultStrategy: KeepAwakeStrategy = screenWakeLockStrategy
let defaultKeepAwake: KeepAwakeInstance | null = null

/**
 * Chooses how the screen is kept awake wherever no `KeepAwakeProvider` is in
 * the tree, which spares an app that has one answer for its whole lifetime —
 * a web app inside a native shell, say — from wrapping anything.
 *
 * Call it while the app starts. Claims are counted per instance, so the
 * strategy can no longer be swapped once something has asked for the screen.
 */
export const setDefaultKeepAwakeStrategy = (strategy: KeepAwakeStrategy) => {
	if (defaultKeepAwake) {
		throw new Error(
			'react-keep-awake: the default strategy is already in use. Set it before the first component asks to keep the screen awake.',
		)
	}
	defaultStrategy = strategy
}

/**
 * The shared instance, built on first use so that merely importing this
 * package touches no browser globals.
 */
export const getDefaultKeepAwake = (): KeepAwakeInstance => {
	if (!defaultKeepAwake) {
		defaultKeepAwake = createKeepAwake(defaultStrategy)
	}
	return defaultKeepAwake
}

/** Test seam: forgets the instance and the chosen strategy. */
export const resetDefaultKeepAwake = () => {
	defaultKeepAwake = null
	defaultStrategy = screenWakeLockStrategy
}
