import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getSharedKeepAwake,
	resetSharedKeepAwake,
	setKeepAwakeStrategy,
} from '../src/sharedKeepAwake'
import type { KeepAwakeStrategy } from '../src/KeepAwakeStrategy'

const createStrategy = (isSupported = true): KeepAwakeStrategy => ({
	isSupported: vi.fn(() => isSupported),
	activate: vi.fn(() => vi.fn()),
})

describe('setKeepAwakeStrategy', () => {
	beforeEach(() => {
		resetSharedKeepAwake()
		vi.unstubAllGlobals()
	})

	it('is what the hook uses', () => {
		const strategy = createStrategy()
		setKeepAwakeStrategy(strategy)

		getSharedKeepAwake().request()

		expect(strategy.activate).toHaveBeenCalledTimes(1)
	})

	it('falls back to the screen wake lock api', () => {
		vi.stubGlobal('navigator', {})

		expect(getSharedKeepAwake().getState().isSupported).toBe(false)
	})

	it('refuses to change once the instance is in use', () => {
		setKeepAwakeStrategy(createStrategy())
		getSharedKeepAwake()

		expect(() => {
			setKeepAwakeStrategy(createStrategy())
		}).toThrow(/already in use/)
	})

	it('hands out one instance', () => {
		expect(getSharedKeepAwake()).toBe(getSharedKeepAwake())
	})
})
