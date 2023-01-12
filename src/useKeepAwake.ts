import { useEffect } from 'react'
import { useWakeLock } from 'react-screen-wake-lock'

export const useKeepAwake = (active = true) => {
	const { isSupported, released, request, release } = useWakeLock()

	useEffect(() => {
		if (!isSupported) {
			return
		}

		if (active === released) {
			if (active) {
				request()
			} else {
				release()
			}
		}
	}, [active, isSupported, release, released, request])
}
