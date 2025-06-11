import type { FunctionComponent } from 'react'
import { useKeepAwake } from './useKeepAwake'

export interface KeepAwakeProps {
	disabled?: boolean
}

export const KeepAwake: FunctionComponent<KeepAwakeProps> = ({
	disabled = false,
}) => {
	useKeepAwake(!disabled)

	return null
}
