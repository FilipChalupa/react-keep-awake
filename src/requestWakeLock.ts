let activeWakeLocks = 0
// eslint-disable-next-line no-undef
let wakeLock: WakeLockSentinel | null = null

const handleVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		request()
	}
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
	if (wakeLock) {
		return
	}
	if (!('wakeLock' in navigator)) {
		// @TODO: Add fallback to invisible video element or similar
		return
	}
	try {
		wakeLock = await navigator.wakeLock.request('screen')
	} catch (error) {
		console.warn('Failed to acquire wake lock')
		console.error(error)
	}
	wakeLock?.addEventListener('release', () => {
		wakeLock = null
	})

	// Wake lock was requested by user to deactivate before the activation request finished.
	if (activeWakeLocks === 0) {
		release()
	}
}

const release = () => {
	if (!wakeLock) {
		return
	}
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
