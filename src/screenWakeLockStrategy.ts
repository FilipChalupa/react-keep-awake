import type { KeepAwakeStrategy } from './KeepAwakeStrategy'

/**
 * Keeps the screen awake with the
 * [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).
 *
 * The browser hands the lock back whenever the page stops being visible, so
 * this watches visibility and asks for it again on the way back. A request
 * can also be refused outright (some browsers want a user gesture first, or
 * the device is saving battery), so the next tap or key press tries again.
 *
 * Note it is unavailable inside WebViews on every platform, which a native
 * shell can work around by passing its own strategy to `KeepAwakeProvider`.
 */
export const screenWakeLockStrategy: KeepAwakeStrategy = {
	isSupported: () =>
		typeof navigator !== 'undefined' && 'wakeLock' in navigator,
	activate: ({ onActiveChange, onError }) => {
		let sentinel: WakeLockSentinel | null = null
		// Two overlapping requests would both get past the "already held"
		// check below. The screen obeys the newer sentinel and the older one
		// could never be released again.
		let pendingRequest: Promise<void> | null = null
		let isDeactivated = false

		const release = () => {
			const heldSentinel = sentinel
			if (!heldSentinel) {
				return
			}
			// Forgotten before the asynchronous release settles, so a request
			// made in the meantime starts from a clean slate instead of being
			// skipped by the "already held" check.
			sentinel = null
			onActiveChange(false)
			heldSentinel.release().catch(onError)
		}

		const request = async () => {
			if (isDeactivated) {
				return
			}
			if (document.visibilityState !== 'visible') {
				return
			}
			if (sentinel || pendingRequest) {
				return
			}
			pendingRequest = (async () => {
				try {
					const acquiredSentinel = await navigator.wakeLock.request('screen')
					acquiredSentinel.addEventListener('release', () => {
						// Only while it is still the one being held — by the time a
						// release arrives, a newer request may have replaced it.
						if (sentinel === acquiredSentinel) {
							sentinel = null
							onActiveChange(false)
						}
					})
					sentinel = acquiredSentinel
					onActiveChange(true)
				} catch (error) {
					onError(error)
				}
			})()

			try {
				await pendingRequest
			} finally {
				pendingRequest = null
			}

			// Let go while this request was still in flight.
			if (isDeactivated) {
				release()
			}
		}

		// Coming back to the page, and any interaction while the lock is not
		// held: a gesture is what a browser that refused before may be waiting
		// for. While the lock is held, `request` returns straight away.
		const retryEvents = ['visibilitychange', 'pointerdown', 'keydown'] as const
		const handleRetry = () => {
			request()
		}

		for (const type of retryEvents) {
			document.addEventListener(type, handleRetry)
		}
		request()

		return () => {
			isDeactivated = true
			for (const type of retryEvents) {
				document.removeEventListener(type, handleRetry)
			}
			release()
		}
	},
}
