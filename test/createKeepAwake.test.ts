import { describe, expect, it, vi } from 'vitest'
import { createKeepAwake } from '../src/createKeepAwake'
import type {
	KeepAwakeStrategy,
	KeepAwakeStrategyCallbacks,
} from '../src/KeepAwakeStrategy'

const createRecordingStrategy = (isSupported = true) => {
	const deactivate = vi.fn()
	let callbacks: KeepAwakeStrategyCallbacks | null = null

	const strategy: KeepAwakeStrategy = {
		isSupported: vi.fn(() => isSupported),
		activate: vi.fn((activateCallbacks) => {
			callbacks = activateCallbacks
			return deactivate
		}),
	}

	return {
		strategy,
		deactivate,
		report: (isActive: boolean) => {
			callbacks?.onActiveChange(isActive)
		},
		fail: (error: unknown) => {
			callbacks?.onError(error)
		},
	}
}

describe('createKeepAwake', () => {
	it('activates for the first claim only', () => {
		const { strategy } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)

		keepAwake.request()
		keepAwake.request()

		expect(strategy.activate).toHaveBeenCalledTimes(1)
	})

	it('deactivates once the last claim is given up', () => {
		const { strategy, deactivate } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)

		const giveUpFirst = keepAwake.request()
		const giveUpSecond = keepAwake.request()

		giveUpFirst()
		expect(deactivate).not.toHaveBeenCalled()

		giveUpSecond()
		expect(deactivate).toHaveBeenCalledTimes(1)
	})

	it('ignores a claim given up twice', () => {
		const { strategy, deactivate } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)

		const giveUpFirst = keepAwake.request()
		keepAwake.request()

		giveUpFirst()
		giveUpFirst()

		// The second claim is still standing.
		expect(deactivate).not.toHaveBeenCalled()
	})

	it('activates again after everything was given up', () => {
		const { strategy } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)

		keepAwake.request()()
		keepAwake.request()

		expect(strategy.activate).toHaveBeenCalledTimes(2)
	})

	it('passes on what the strategy reports', () => {
		const { strategy, report, fail } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)
		const states: Array<boolean> = []
		keepAwake.subscribe((state) => {
			states.push(state.isActive)
		})

		keepAwake.request()
		report(true)
		expect(keepAwake.getState().isActive).toBe(true)

		const refusal = new Error('NotAllowedError')
		fail(refusal)

		expect(keepAwake.getState().isActive).toBe(false)
		expect(keepAwake.getState().error).toBe(refusal)
		expect(states).toEqual([true, false])
	})

	it('reports an unsupported strategy without being asked for the screen', () => {
		const { strategy } = createRecordingStrategy(false)
		const keepAwake = createKeepAwake(strategy)

		expect(keepAwake.getState()).toEqual({
			isSupported: false,
			isActive: false,
			error: null,
		})
		expect(strategy.activate).not.toHaveBeenCalled()
	})

	it('stops telling a subscriber that has unsubscribed', () => {
		const { strategy, report } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)
		const listener = vi.fn()

		const unsubscribe = keepAwake.subscribe(listener)
		keepAwake.request()
		report(true)
		expect(listener).toHaveBeenCalledTimes(1)

		unsubscribe()
		report(false)

		expect(listener).toHaveBeenCalledTimes(1)
	})

	it('says nothing when the state has not changed', () => {
		const { strategy, report } = createRecordingStrategy()
		const keepAwake = createKeepAwake(strategy)
		const listener = vi.fn()
		keepAwake.subscribe(listener)

		keepAwake.request()
		report(true)
		report(true)

		expect(listener).toHaveBeenCalledTimes(1)
	})

	it('survives a strategy that throws on activate', () => {
		const explosion = new Error('bridge not ready')
		const keepAwake = createKeepAwake({
			isSupported: () => true,
			activate: () => {
				throw explosion
			},
		})

		expect(() => keepAwake.request()).not.toThrow()
		expect(keepAwake.getState().error).toBe(explosion)
		expect(keepAwake.getState().isActive).toBe(false)
	})

	it('survives a strategy that throws on deactivate', () => {
		const explosion = new Error('bridge went away')
		const keepAwake = createKeepAwake({
			isSupported: () => true,
			activate: () => () => {
				throw explosion
			},
		})
		const giveUp = keepAwake.request()

		expect(() => giveUp()).not.toThrow()
		expect(keepAwake.getState().error).toBe(explosion)
	})

	it('survives a strategy that throws when asked whether it is supported', () => {
		const explosion = new Error('no idea')
		const keepAwake = createKeepAwake({
			isSupported: () => {
				throw explosion
			},
			activate: () => vi.fn(),
		})

		expect(keepAwake.getState()).toEqual({
			isSupported: false,
			isActive: false,
			error: explosion,
		})
	})

	it('never starts an unsupported strategy', () => {
		const { strategy } = createRecordingStrategy(false)
		const keepAwake = createKeepAwake(strategy)

		keepAwake.request()

		expect(strategy.activate).not.toHaveBeenCalled()
	})
})
