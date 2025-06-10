let activeWakeLocks = 0

export const requestWakeLock = () => {
	if (activeWakeLocks === 0) {
		// @TODO: Request for real
	}
	activeWakeLocks++
	const release = () => {
		activeWakeLocks--
		if (activeWakeLocks === 0) {
			// @TODO: Release for real
		}
	}

	return release
}
