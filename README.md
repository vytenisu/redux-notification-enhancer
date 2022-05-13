# Redux Notification Enhancer

_by Vytenis Urbonavičius_

_Redux Notification Enhancer (**RNE**)_ drastically improves performance of some _Redux_-based applications by providing control over when dispatched actions are causing subscriber notifications

**Main features:**

- **Notification throttling** - if enabled, it makes sure that subscribers are allowed to finish handling state changes before a new notification is triggered. By default _Redux_ is notifying all subscribers on every state change.
- **Manual notification control** - when used, it allows to mark certain actions as _passive_ - they would update state but avoid notifying subscribers.

---

**Example use case:**

When using _Redux_ with _**React**_, _React_ performs render on every _Redux_ notification for every single state change. If a very complex system is developed and render becomes heavy despite being well written, optimized using memoization and other techniques - it becomes important to reduce amount of renders to achieve much higher browser frame rate.

This can be achieved by:

- Enabling throttling and making sure that browser draws frames between renders.
- Identifying actions which should not cause render all by themselves and marking them as passive.

---

**WARNING:**

_**RNE**_ by design brakes default lifecycle of _Redux_ and increases complexity of code. Only use in projects where performance is critical and cannot be achieved by other optimization techniques. Please see "Common mistakes" section for more details.

---

## Integration

Simplest way to include _**RNE**_ into _Redux_ is by passing it as a second argument to _createStore_.

```javascript
const {enhancer} = createNotificationEnhancer(options)
const store = createStore(reducers, enhancer)
```

If you need other enhancers such as _applyMiddleware_, you can provide them using `compose()` function provided by _Redux_.

```javascript
const {enhancer} = createNotificationEnhancer(options)
const multipleEnhancers = compose(applyMiddleware(thunk), enhancer)
const store = createStore(reducers, enhancers)
```

---

## Usage

_**RNE**_ provides function for marking actions as "passive" or "immediate". These functions modify action "type" string by adding special prefixes.

**Passive** actions are actions which should modify state but should not notify subscribers.

**Immediate** actions are actions which should be executed at once even if throttling is enabled.

If no marker is used - action is either throttled (if throttling is enabled) or executed normally as in standard _Redux_ without _**RNE**_.

```javascript
const {enhancer, passive, immediate} = createNotificationEnhancer(options)

const store = createStore(reducers, enhancer)

// Throttled if throttling is enabled
store.dispatch({type: 'NORMAL_ACTION'})

// Changes state, but does not notify
store.dispatch({type: passive('STATE_CHANGE_ONLY')})

// Executed at once even if throttling is enabled
store.dispatch({type: immediate('THROTTLE_BYPASS')})
```

---

## Options

| Option           | Default                          | Meaning                                                                                                                               |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| throttle         | false                            | Makes sure that promises of subscribers are resolved before notifying them again.                                                     |
| requestAnimation | true                             | When throttling is enabled it requests animation frame after subscribers are notified. **Should be disabled if used not on browser.** |
| prefixes         | `{passive:'S%', immediate:'I%'}` | Allows changing one or all marker prefixes to custom ones.                                                                            |

---

## Response of createNotificationEnhancer

| Key                    | Meaning                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| enhancer               | Enhancer itself to be passed to createStore of _Redux_                                                                                                                                            |
| passive                | Function for modifying action type and marking that action as "passive" - only impacting state but not notifying subscribers.                                                                     |
| immediate              | Function for modifying action type and marking that action as "immeditate" - to be executed at once even if throttling is enabled. There is no need to use this marker if throttling is disabled. |
| getNotificationPromise | Returns promise of current notifications. This promise is resolve once all currently notified subscribers complete their work. There is no need to use this promise if throttling is disabled.    |

---

**Example use case for _getNotificationPromise_:**

If _React_ is used together with _Redux_ and _**RNE**_ with throttling enabled, _React_ renders may happen slightly later than expected. To ensure that last render completed, _getNotificationPromise_ can be used:

```javascript
// Perform some code which causes render here
// ...
await getNotificationPromise()
// ...
// Perform code which needs to read DOM or depend on render in some other way here
```

---

## Troubleshooting

**Problem:**

State changes are not reflected in another part of the application (_React-based_ UI for example).

**Solution:**

- Make sure your actions are not marked as passive.
- If using on browser, make sure that _requestAnimation_ option is enabled.

---

**_Problem:_**

My actions trigger notifications too rarely (causing lagging animations for example).

**_Solution:_**

When throttling is used, notifications are delayed until all subscribers complete their work. In many cases this improves performance drastically. However, in some cases actions do not need to wait for all subscribers - you can try adding exceptions for certain actions by marking them as "immediate".

---

**_Problem:_**

Subscribers are notified often causing lag and excessive calculations.

**_Solution:_**

_**RNE**_ throttling is designed to tackles this issue. However, it is disabled by default. Make sure you enable throttling feature by passing a "throttle" flag as "true".

---

**Problem:**

I am using _React_ and my code depends on DOM which should change after dispatching an action. However, DOM does not change immediately after dispatching that action when using _**RNE**_.

**Solution:**

Request last render promise using `getNotificationPromise` and wait for it to resolve before performing operations on DOM.
