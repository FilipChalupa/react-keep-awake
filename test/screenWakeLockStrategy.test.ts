import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screenWakeLockStrategy } from '../src/screenWakeLockStrategy'

type Listener = () => void

const createSentinel = () => {
	const listeners: Listener[] = []
	const fire = () => {
		sentinel.released = true
		for (const listener of [...listeners]) {
			listener()
		}
	}
	const sentinel = {
		released: false,
		release: vi.fn(async () => {
			fire()
		}),
		addEventListener: (type: string, listener: Listener) => {
			if (type === 'release') {
				listeners.push(listener)
			}
		},
		/** Stands in for the browser letting go of the lock on its own. */
		releaseFromBrowser: fire,
	}

	return sentinel
}

type Sentinel = ReturnType<typeof createSentinel>

const setUpEnvironment = () => {
	const granted: Sentinel[] = []
	const visibilityListeners: Listener[] = []
	let resolveRequest: ((sentinel: Sentinel) => void) | null = null

	const wakeLock = {
		request: vi.fn(
			(): Promise<Sentinel> =>
				new Promise((resolve) => {
					resolveRequest = (sentinel) => {
						granted.push(sentinel)
						resolve(sentinel)
					}
				}),
		),
	}

	const documentStub = {
		visibilityState: 'visible',
		addEventListener: (type: string, listener: Listener) => {
			if (type === 'visibilitychange') {
				visibilityListeners.push(listener)
			}
		},
		removeEventListener: (type: string, listener: Listener) => {
			if (type === 'visibilitychange') {
				visibilityListeners.splice(visibilityListeners.indexOf(listener), 1)
			}
		},
	}

	vi.stubGlobal('navigator', { wakeLock })
	vi.stubGlobal('document', documentStub)

	const activeChanges: boolean[] = []
	const errors: unknown[] = []

	return {
		wakeLock,
		activeChanges,
		errors,
		activate: () =>
			screenWakeLockStrategy.activate({
				onActiveChange: (isActive) => {
					activeChanges.push(isActive)
				},
				onError: (error) => {
					errors.push(error)
				},
			}),
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
			await vi.waitFor(() => expect(granted).toContain(sentinel))
			await Promise.resolve()
			return sentinel
		},
		reject: async (error: unknown) => {
			resolveRequest = null
			wakeLock.request.mockRejectedValueOnce(error)
		},
	}
}

describe('screenWakeLockStrategy', () => {
	beforeEach(() => {
		vi.unstubAllGlobals()
	})

	it('releases the sentinel when deactivated', async () => {
		const environment = setUpEnvironment()
		const deactivate = environment.activate()
		const sentinel = await environment.grant()
		expect(sentinel.released).toBe(false)

		deactivate()

		expect(sentinel.release).toHaveBeenCalledTimes(1)
		expect(sentinel.released).toBe(true)
	})

	it('releases a sentinel granted after it was already deactivated', async () => {
		const environment = setUpEnvironment()
		const deactivate = environment.activate()
		// The request the browser is still working on knows nothing about it.
		deactivate()

		const sentinel = await environment.grant()

		expect(sentinel.released).toBe(true)
	})

	it('asks for one sentinel only while a request is in flight', () => {
		const environment = setUpEnvironment()
		environment.activate()

		environment.setVisibility('visible')

		expect(environment.wakeLock.request).toHaveBeenCalledTimes(1)
	})

	it('acquires again after the browser released on its own', async () => {
		const environment = setUpEnvironment()
		environment.activate()
		const sentinel = await environment.grant()

		// Hiding the page makes the browser drop the lock by itself.
		sentinel.releaseFromBrowser()
		environment.setVisibility('hidden')
		expect(environment.wakeLock.request).toHaveBeenCalledTimes(1)

		environment.setVisibility('visible')

		expect(environment.wakeLock.request).toHaveBeenCalledTimes(2)
	})

	it('reports holding and letting go', async () => {
		const environment = setUpEnvironment()
		const deactivate = environment.activate()
		await environment.grant()
		expect(environment.activeChanges).toEqual([true])

		deactivate()

		expect(environment.activeChanges).toEqual([true, false])
	})

	it('reports a refused request', async () => {
		const environment = setUpEnvironment()
		const refusal = new Error('NotAllowedError')
		await environment.reject(refusal)

		environment.activate()
		await vi.waitFor(() => expect(environment.errors).toHaveLength(1))

		expect(environment.errors).toEqual([refusal])
		expect(environment.activeChanges).toEqual([])
	})

	it('is unsupported without the api', () => {
		vi.stubGlobal('navigator', {})

		expect(screenWakeLockStrategy.isSupported()).toBe(false)
	})
})
