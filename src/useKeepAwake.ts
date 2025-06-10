import { useEffect } from 'react'
import { requestWakeLock } from './requestWakeLock'

export const useKeepAwake = (active = true) => {
	useEffect(() => {
		if (!active) {
			return
		}
		const release = requestWakeLock()
		return () => {
			release()
		}
	}, [active])
}
