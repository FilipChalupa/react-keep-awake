import type { FunctionComponent } from 'react'
import { useKeepAwake } from './useKeepAwake'

export interface KeepAwakeProps {
	active?: boolean
}

export const KeepAwake: FunctionComponent<KeepAwakeProps> = ({
	active = true,
}) => {
	useKeepAwake(active)

	return null
}
