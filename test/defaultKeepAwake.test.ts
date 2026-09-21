import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	getDefaultKeepAwake,
	resetDefaultKeepAwake,
	setDefaultKeepAwakeStrategy,
} from '../src/defaultKeepAwake'
import type { KeepAwakeStrategy } from '../src/KeepAwakeStrategy'

const createStrategy = (isSupported = true): KeepAwakeStrategy => ({
	isSupported: vi.fn(() => isSupported),
	activate: vi.fn(() => vi.fn()),
})

describe('setDefaultKeepAwakeStrategy', () => {
	beforeEach(() => {
		resetDefaultKeepAwake()
		vi.unstubAllGlobals()
	})

	it('is what the shared instance uses', () => {
		const strategy = createStrategy()
		setDefaultKeepAwakeStrategy(strategy)

		getDefaultKeepAwake().request()

		expect(strategy.activate).toHaveBeenCalledTimes(1)
	})

	it('falls back to the screen wake lock api', () => {
		vi.stubGlobal('navigator', {})

		expect(getDefaultKeepAwake().getState().isSupported).toBe(false)
	})

	it('refuses to change once the instance is in use', () => {
		setDefaultKeepAwakeStrategy(createStrategy())
		getDefaultKeepAwake()

		expect(() => {
			setDefaultKeepAwakeStrategy(createStrategy())
		}).toThrow(/already in use/)
	})

	it('hands out one instance', () => {
		expect(getDefaultKeepAwake()).toBe(getDefaultKeepAwake())
	})
})
