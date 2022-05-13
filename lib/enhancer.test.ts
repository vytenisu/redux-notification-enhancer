import {createStore} from 'redux'
import {createNotificationEnhancer} from './enhancer'

global.requestAnimationFrame = jest.fn()

jest.useRealTimers()
const actualTimeout = setTimeout
jest.useFakeTimers()

const flushPromises = async () => await new Promise(resolve => actualTimeout(resolve))

describe('Redux Notification Enhancer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips render when passive action is called', () => {
    const {enhancer, passive} = createNotificationEnhancer()
    const store = createStore(() => null, enhancer)
    const subscriber = jest.fn()
    store.subscribe(subscriber)
    store.dispatch({type: passive('TEST')})
    expect(subscriber).not.toHaveBeenCalled()
  })

  it('does not skip render when passive flag is not used', () => {
    const {enhancer} = createNotificationEnhancer()
    const store = createStore(() => null, enhancer)
    const subscriber = jest.fn()
    store.subscribe(subscriber)
    store.dispatch({type: 'TEST'})
    expect(subscriber).toHaveBeenCalledTimes(1)
  })

  it('throttles render when throttle is enabled', async () => {
    const {enhancer} = createNotificationEnhancer({throttle: true})
    const store = createStore(() => null, enhancer)

    let resolve: (value?: any) => void

    const promise = new Promise(rs => {
      resolve = rs
    })

    const subscriber = jest.fn(() => promise)

    store.subscribe(subscriber)
    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})

    jest.runAllTimers()
    expect(subscriber).toHaveBeenCalledTimes(1)

    resolve()
    await flushPromises()
    jest.runAllTimers()
    expect(subscriber).toHaveBeenCalledTimes(2)
  })

  it('does not throttle when throttle is disabled', () => {
    const {enhancer} = createNotificationEnhancer({throttle: false})
    const store = createStore(() => null, enhancer)

    const promise = new Promise(() => {})
    const subscriber = jest.fn(() => promise)
    store.subscribe(subscriber)

    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})

    expect(subscriber).toHaveBeenCalledTimes(3)
  })

  it('triggers animation frame when triggering and throttling is enabled', async () => {
    const {enhancer} = createNotificationEnhancer({throttle: true})
    const store = createStore(() => null, enhancer)

    const subscriber = jest.fn()
    store.subscribe(subscriber)

    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})

    jest.runAllTimers()
    await flushPromises()
    jest.runAllTimers()
    await flushPromises()

    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  it('does not trigger animation frame when triggering is disabled', async () => {
    const {enhancer} = createNotificationEnhancer({throttle: true, requestAnimation: false})
    const store = createStore(() => null, enhancer)

    const subscriber = jest.fn()
    store.subscribe(subscriber)

    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})

    jest.runAllTimers()
    await flushPromises()
    jest.runAllTimers()
    await flushPromises()

    expect(global.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('allows modifying passive action type prefix', () => {
    const CUSTOM_PREFIX = 'CUSTOM_'
    const TEST_ACTION = 'TEST_ACTION'
    const {passive} = createNotificationEnhancer({prefixes: {passive: CUSTOM_PREFIX}})
    expect(passive(TEST_ACTION)).toBe(`${CUSTOM_PREFIX}${TEST_ACTION}`)
  })

  it('allows modifying immediate action type prefix', () => {
    const CUSTOM_PREFIX = 'CUSTOM_'
    const TEST_ACTION = 'TEST_ACTION'
    const {immediate} = createNotificationEnhancer({prefixes: {immediate: CUSTOM_PREFIX}})
    expect(immediate(TEST_ACTION)).toBe(`${CUSTOM_PREFIX}${TEST_ACTION}`)
  })

  it('triggers immediate action at once', () => {
    const {enhancer, immediate} = createNotificationEnhancer({throttle: true})
    const store = createStore(() => null, enhancer)

    let resolve: (value?: any) => void

    const promise = new Promise(rs => {
      resolve = rs
    })

    const subscriber = jest.fn(() => promise)

    store.subscribe(subscriber)
    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})
    store.dispatch({type: 'TEST'})
    store.dispatch({type: immediate('TEST')})

    jest.runAllTimers()
    expect(subscriber).toHaveBeenCalledTimes(2)
  })

  it('notifies when render is complete', async () => {
    const {enhancer, getNotificationPromise} = createNotificationEnhancer({
      throttle: true,
    })

    const store = createStore(() => null, enhancer)

    let resolve: (value?: any) => void

    const promise = new Promise(rs => {
      resolve = rs
    })

    const subscriber = jest.fn(() => promise)
    store.subscribe(subscriber)

    const afterNotificationHandler = jest.fn()

    store.dispatch({type: 'TEST'})
    getNotificationPromise().then(() => afterNotificationHandler())
    jest.runAllTimers()
    await flushPromises()

    expect(afterNotificationHandler).not.toHaveBeenCalled()

    resolve()
    jest.runAllTimers()
    await flushPromises()

    expect(afterNotificationHandler).toHaveBeenCalled()
  })
})
