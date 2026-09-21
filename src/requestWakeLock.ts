let activeWakeLocks = 0
// eslint-disable-next-line no-undef
let wakeLock: WakeLockSentinel | null = null
// Set while a request is in flight. Two overlapping requests would both get
// past the "already held" check below — the screen only obeys the newer
// sentinel, and the older one could never be released again.
let pendingRequest: Promise<void> | null = null

const handleVisibilityChange = () => {
	request()
}

const activate = () => {
	document.addEventListener('visibilitychange', handleVisibilityChange)
	request()
}

const deactivate = () => {
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	release()
}

const request = async () => {
	if (document.visibilityState !== 'visible') {
		return
	}
	if (wakeLock || pendingRequest) {
		return
	}
	if (!('wakeLock' in navigator)) {
		// @TODO: Add fallback to invisible video element or similar
		return
	}

	pendingRequest = (async () => {
		try {
			const sentinel = await navigator.wakeLock.request('screen')
			sentinel.addEventListener('release', () => {
				// The browser releases the sentinel on its own when the page is
				// hidden. Only forget it while it is still the one being held —
				// by the time a release arrives, a newer request may have
				// replaced it.
				if (wakeLock === sentinel) {
					wakeLock = null
				}
			})
			wakeLock = sentinel
		} catch (error) {
			console.warn('Failed to acquire wake lock')
			console.error(error)
		}
	})()

	try {
		await pendingRequest
	} finally {
		pendingRequest = null
	}

	// Wake lock was requested by user to deactivate before the activation request finished.
	if (activeWakeLocks === 0) {
		release()
	}
}

const release = () => {
	const heldWakeLock = wakeLock
	if (!heldWakeLock) {
		return
	}
	// Forgotten before the asynchronous release settles, so a request made in
	// the meantime starts from a clean slate instead of being skipped by the
	// "already held" check.
	wakeLock = null
	heldWakeLock.release().catch((error) => {
		console.warn('Failed to release wake lock')
		console.error(error)
	})
}

export const requestWakeLock = () => {
	if (activeWakeLocks === 0) {
		activate()
	}
	activeWakeLocks++
	const release = () => {
		activeWakeLocks--
		if (activeWakeLocks === 0) {
			deactivate()
		}
	}

	return release
}
