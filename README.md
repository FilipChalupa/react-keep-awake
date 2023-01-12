# Reack keep awake [![npm](https://img.shields.io/npm/v/react-keep-awake.svg)](https://www.npmjs.com/package/react-keep-awake) ![npm type definitions](https://img.shields.io/npm/types/react-keep-awake.svg)

React component and hook to keep screen awake.

## Installation

```bash
npm install react-keep-awake
```

## How to use

To keep screen awake by component:

```jsx
import { KeepAwake } from 'react-keep-awake'

const MyApp = () => {
	return (
		<main>
			<KeepAwake />
			<p>Lorem ipsum</p>
		</main>
	)
}
```

To keep screen awake by hook:

```jsx
import { useKeepAwake } from 'react-keep-awake'

const MyApp = () => {
	useKeepAwake()

	return (
		<main>
			<p>Lorem ipsum</p>
		</main>
	)
}
```

## Development

```bash
npm ci
npm run dev
```
