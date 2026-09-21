export interface KeepAwakeStrategyCallbacks {
	/**
	 * Report whether the screen is being held awake right now. A strategy may
	 * lose the hold and take it back on its own — the browser drops a screen
	 * wake lock whenever the page is hidden — so this can be called any
	 * number of times.
	 */
	onActiveChange: (isActive: boolean) => void
	/** Report why holding the screen awake failed. */
	onError: (error: unknown) => void
}

export interface KeepAwakeStrategy {
	/**
	 * Whether this strategy can do anything here. Consulted once, lazily, so
	 * it is safe to look at globals that only exist in a browser.
	 */
	isSupported: () => boolean
	/**
	 * Start keeping the screen awake. Called when the first consumer asks for
	 * it; the returned function is called once the last one goes away.
	 */
	activate: (callbacks: KeepAwakeStrategyCallbacks) => () => void
}

export interface KeepAwakeState {
	/** Whether the strategy in use can keep this screen awake at all. */
	isSupported: boolean
	/** Whether the screen is being held awake at this moment. */
	isActive: boolean
	/** Why the last attempt failed, or `null` if none has. */
	error: unknown | null
}
