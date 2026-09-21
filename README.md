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

Where the Screen Wake Lock API is missing — a web app inside a native shell, say — supply your own strategy while the app starts:

```js
import { setKeepAwakeStrategy } from 'react-keep-awake'

setKeepAwakeStrategy({
	isSupported: () => Boolean(window.ReactNativeWebView),
	activate: ({ onActiveChange, onError }) => {
		// Listen first: the shell is the one that knows whether it got the
		// hold, and it can lose it later without anyone asking the web.
		const stopListening = listenToNative((message) => {
			if (message.type === 'keepAwakeChanged') {
				onActiveChange(message.isActive)
			} else if (message.type === 'keepAwakeFailed') {
				onError(message.reason)
			}
		})

		postMessageToNative({ type: 'keepAwakeStart' })

		return () => {
			postMessageToNative({ type: 'keepAwakeStop' })
			stopListening()
		}
	},
})
```

`activate` is called for the first component asking to keep the screen awake and its result is called once the last one goes away, so a strategy never sees the counting. `useKeepAwake` reports its state the same way it reports the built-in one.

Call it before the first component asks for the screen — claims are counted per instance, so the strategy cannot be swapped afterwards.

A strategy that throws is treated exactly like one that reports an error: it is recorded in `error` and the app carries on. Keeping the screen awake is a comfort, never a reason to bring down what asked for it.

For a second, separately counted instance — a test, or a story — build one with `createKeepAwake(strategy)` and drive it yourself.

## Development

```bash
npm ci
npm run dev
```

Run the tests with `npm test`.
