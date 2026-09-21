# React keep awake [![npm](https://img.shields.io/npm/v/react-keep-awake.svg)](https://www.npmjs.com/package/react-keep-awake) ![npm type definitions](https://img.shields.io/npm/types/react-keep-awake.svg)

React component and hook to keep screen awake using [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

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

## Knowing whether it worked

A screen wake lock is unavailable in more places than it is available — [not in any WebView](https://caniwebview.com/features/web-feature-screen-wake-lock/), and the browser can refuse one on a device that is low on battery. The hook reports what actually happened, so silence is not mistaken for success:

```jsx
const { isSupported, isActive, error } = useKeepAwake()
```

- `isSupported` — whether this environment can keep the screen awake at all.
- `isActive` — whether the screen is being held awake at this moment. The browser hands the lock back whenever the page is hidden, so this goes false and true again on its own.
- `error` — why the last attempt failed, or `null`.

## Keeping the screen awake some other way

Where the Screen Wake Lock API is missing — a web app inside a native shell, say — supply your own strategy. Everything below the provider uses it instead, and the hook reports its state the same way:

```jsx
import { KeepAwakeProvider } from 'react-keep-awake'

const nativeStrategy = {
	isSupported: () => Boolean(window.ReactNativeWebView),
	activate: ({ onActiveChange, onError }) => {
		postMessageToNative({ type: 'keepAwakeStart' })
		onActiveChange(true)

		return () => {
			postMessageToNative({ type: 'keepAwakeStop' })
			onActiveChange(false)
		}
	},
}

const MyApp = () => (
	<KeepAwakeProvider strategy={nativeStrategy}>
		<Screens />
	</KeepAwakeProvider>
)
```

`activate` is called for the first component asking to keep the screen awake and its result is called once the last one goes away, so a strategy never sees the counting. Keep the strategy object itself stable — a new one starts over.

When the answer is the same for the whole app, skip the provider and say so while the app starts:

```js
import { setDefaultKeepAwakeStrategy } from 'react-keep-awake'

setDefaultKeepAwakeStrategy(nativeStrategy)
```

Everything without a provider above it then uses that. Call it before the first component asks for the screen — claims are counted per instance, so it cannot be swapped afterwards.

## Development

```bash
npm ci
npm run dev
```

Run the tests with `npm test`.
