import type { FunctionComponent } from 'react'
import { useKeepAwake } from './useKeepAwake'

export interface KeepAwakeProps {
	active?: boolean // Deprecated
	disabled?: boolean
}

export const KeepAwake: FunctionComponent<KeepAwakeProps> = ({
	active = true,
	disabled = false,
}) => {
	useKeepAwake(!disabled && active)

	return null
}
