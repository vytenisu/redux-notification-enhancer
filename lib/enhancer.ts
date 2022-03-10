import type {StoreCreator, StoreEnhancer} from 'redux'

export interface CreateNotificationEnhancerArgs {
  onRender?: (renderPromise: Promise<void>) => void
  throttle?: boolean
  triggerAnimationFrame?: boolean
  prefixes?: {
    passive?: string
    immediate?: string
  }
}

export interface CreateNotificationEnhancerResponse {
  enhancer: StoreEnhancer
  passive: (type: string) => string
  immediate: (type: string) => string
}

export const createNotificationEnhancer = ({
  onRender = () => {
    // No operation
  },
  throttle = false,
  triggerAnimationFrame = true,
  prefixes: providedPrefixes = {},
}: CreateNotificationEnhancerArgs): CreateNotificationEnhancerResponse => {
  const prefixes = {
    ...{
      passive: 'S%',
      immediate: 'I%',
    },
    ...providedPrefixes,
  }

  return {
    enhancer: (createStore: StoreCreator) => (reducer, state) => {
      const broadcastState = {
        pending: true,
        immediate: false,
        inProgress: false,
      }

      const store = createStore(reducer, state)
      const originalSubscribe = store.subscribe
      const originalDispatch = store.dispatch

      const listeners: (() => void)[] = []

      store.subscribe = (listener: () => void) => {
        if (typeof listener !== 'function') {
          throw new Error('Expected listener to be a function')
        }

        let subscribed = true

        listeners.push(listener)

        return () => {
          if (!subscribed) {
            return
          }

          subscribed = false

          listeners.splice(listeners.indexOf(listener), 1)
        }
      }

      const notify = () => Promise.all(listeners.map(listener => listener()))

      const delayedNotify = () => {
        const promise: Promise<void> = new Promise(resolve => {
          setTimeout(async () => {
            await notify()

            if (triggerAnimationFrame) {
              requestAnimationFrame(() => {
                // No operation
              })
            }

            if (broadcastState.pending) {
              broadcastState.pending = false
              await delayedNotify()
            }

            resolve()
          })
        })

        onRender(promise)
        return promise
      }

      originalSubscribe(async () => {
        if (broadcastState.immediate) {
          broadcastState.immediate = false
          notify()
        } else if (broadcastState.pending) {
          broadcastState.pending = false

          if (throttle) {
            if (broadcastState.inProgress) {
              broadcastState.pending = true
            } else {
              broadcastState.inProgress = true
              await delayedNotify()
              broadcastState.inProgress = false
            }
          } else {
            onRender(
              new Promise(async resolve => {
                await notify()
                resolve()
              }),
            )
          }
        }
      })

      store.dispatch = action => {
        if (!broadcastState.immediate && action.type.startsWith(prefixes.immediate)) {
          broadcastState.immediate = true
        } else if (!broadcastState.pending && !action.type.startsWith(prefixes.passive)) {
          broadcastState.pending = true
        }

        return originalDispatch(action)
      }

      return store
    },
    passive: (type: string) => `${prefixes.passive}${type}`,
    immediate: (type: string) => `${prefixes.immediate}${type}`,
  }
}
