import React, {
	createContext,
	type FunctionComponent,
	type ReactNode,
	useContext,
	useMemo,
} from 'react'
import { createKeepAwake, type KeepAwakeInstance } from './createKeepAwake'
import { getDefaultKeepAwake } from './defaultKeepAwake'
import type { KeepAwakeStrategy } from './KeepAwakeStrategy'

const KeepAwakeContext = createContext<KeepAwakeInstance | null>(null)

/**
 * The instance in scope, or the shared default one when no provider is in
 * the tree — see `setDefaultKeepAwakeStrategy` for choosing what that one
 * does.
 */
export const useKeepAwakeInstance = (): KeepAwakeInstance =>
	useContext(KeepAwakeContext) ?? getDefaultKeepAwake()

export interface KeepAwakeProviderProps {
	/**
	 * How to keep the screen awake below this provider — for instance by
	 * asking a native shell, where the Screen Wake Lock API is unavailable.
	 * Keep the object itself stable; a new one starts over.
	 */
	strategy: KeepAwakeStrategy
	children?: ReactNode
}

/**
 * Serves a different way of keeping the screen awake to everything below
 * it. Claims are counted per provider, so a tree without one is unaffected.
 */
export const KeepAwakeProvider: FunctionComponent<KeepAwakeProviderProps> = ({
	strategy,
	children,
}) => {
	const keepAwake = useMemo(() => createKeepAwake(strategy), [strategy])

	return (
		<KeepAwakeContext.Provider value={keepAwake}>
			{children}
		</KeepAwakeContext.Provider>
	)
}
