import { beforeEach, describe, expect, it, vi } from 'vitest'

type ReleaseListener = () => void

const createSentinel = () => {
	const listeners: ReleaseListener[] = []
	const sentinel = {
		released: false,
		release: vi.fn(async () => {
			sentinel.released = true
			for (const listener of listeners) {
				listener()
			}
		}),
		addEventListener: (type: string, listener: ReleaseListener) => {
			if (type === 'release') {
				listeners.push(listener)
			}
		},
		/** Stands in for the browser letting go of the lock on its own. */
		releaseFromBrowser: () => {
			sentinel.released = true
			for (const listener of listeners) {
				listener()
			}
		},
	}

	return sentinel
}

type Sentinel = ReturnType<typeof createSentinel>

const setUpEnvironment = () => {
	const sentinels: Sentinel[] = []
	const visibilityListeners: ReleaseListener[] = []
	let resolveRequest: ((sentinel: Sentinel) => void) | null = null

	const wakeLock = {
		request: vi.fn(
			(): Promise<Sentinel> =>
				new Promise((resolve) => {
					resolveRequest = (sentinel) => {
						sentinels.push(sentinel)
						resolve(sentinel)
					}
				}),
		),
	}

	const documentStub = {
		visibilityState: 'visible',
		addEventListener: (type: string, listener: ReleaseListener) => {
			if (type === 'visibilitychange') {
				visibilityListeners.push(listener)
			}
		},
		removeEventListener: (type: string, listener: ReleaseListener) => {
			if (type === 'visibilitychange') {
				visibilityListeners.splice(visibilityListeners.indexOf(listener), 1)
			}
		},
	}

	vi.stubGlobal('navigator', { wakeLock })
	vi.stubGlobal('document', documentStub)

	return {
		wakeLock,
		sentinels,
		setVisibility: (visibilityState: 'visible' | 'hidden') => {
			documentStub.visibilityState = visibilityState
			for (const listener of [...visibilityListeners]) {
				listener()
			}
		},
		/** Settles the pending `navigator.wakeLock.request` call. */
		grant: async () => {
			const sentinel = createSentinel()
			resolveRequest?.(sentinel)
			// Let the library's own awaits run.
			await vi.waitFor(() => expect(sentinels).toContain(sentinel))
			await Promise.resolve()
			return sentinel
		},
	}
}

const importFreshModule = async () => {
	vi.resetModules()
	return (await import('../src/requestWakeLock')).requestWakeLock
}

describe('requestWakeLock', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
	})

	it('releases the sentinel once the last holder lets go', async () => {
		const environment = setUpEnvironment()
		const requestWakeLock = await importFreshModule()

		const release = requestWakeLock()
		const sentinel = await environment.grant()
		expect(sentinel.released).toBe(false)

		release()

		expect(sentinel.release).toHaveBeenCalledTimes(1)
		expect(sentinel.released).toBe(true)
	})

	it('keeps the sentinel while another holder is still active', async () => {
		const environment = setUpEnvironment()
		const requestWakeLock = await importFreshModule()

		const releaseFirst = requestWakeLock()
		const releaseSecond = requestWakeLock()
		const sentinel = await environment.grant()

		releaseFirst()
		expect(sentinel.released).toBe(false)

		releaseSecond()
		expect(sentinel.released).toBe(true)
	})

	it('releases a sentinel granted after the last holder already let go', async () => {
		const environment = setUpEnvironment()
		const requestWakeLock = await importFreshModule()

		const release = requestWakeLock()
		// Nobody wants the screen awake any more, but the request the browser
		// is still working on knows nothing about it.
		release()

		const sentinel = await environment.grant()

		expect(sentinel.released).toBe(true)
	})

	it('asks for one sentinel only while a request is in flight', async () => {
		const environment = setUpEnvironment()
		const requestWakeLock = await importFreshModule()

		requestWakeLock()
		requestWakeLock()

		expect(environment.wakeLock.request).toHaveBeenCalledTimes(1)
	})

	it('acquires again after the browser released on its own', async () => {
		const environment = setUpEnvironment()
		const requestWakeLock = await importFreshModule()

		requestWakeLock()
		const sentinel = await environment.grant()

		// Hiding the page makes the browser drop the lock by itself.
		sentinel.releaseFromBrowser()
		environment.setVisibility('hidden')
		expect(environment.wakeLock.request).toHaveBeenCalledTimes(1)

		environment.setVisibility('visible')

		expect(environment.wakeLock.request).toHaveBeenCalledTimes(2)
	})
})
