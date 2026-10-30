import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client/web'

/** Test-only stand-in for Turso: a real in-memory libSQL database that can be told to fail. */
export function fakeTurso() {
  const real = createClient({ url: ':memory:' })
  const state = { failing: false, batches: 0, executes: 0 }
  const client = new Proxy(real, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target)
      if (typeof value !== 'function') return value
      if (prop === 'execute' || prop === 'batch') {
        return (...args: unknown[]) => {
          if (state.failing) return Promise.reject(new Error('network down'))
          state[prop === 'batch' ? 'batches' : 'executes']++
          return value.apply(target, args)
        }
      }
      return value.bind(target)
    },
  })
  return { client: client as unknown as Client, real, state }
}
