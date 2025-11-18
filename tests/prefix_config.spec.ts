/*
 * @adonisjs/cache
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { setupApp } from './helpers.js'
import { defineConfig, drivers, store } from '../index.js'

test.group('Prefix config bug fix', () => {
  test('prefix in defineConfig should not be passed to BentoCache', async ({ assert }) => {
    /**
     * This test verifies that when a user passes 'prefix' in defineConfig,
     * it doesn't get incorrectly passed to BentoCache constructor.
     * The prefix should only be used at the driver/store level, not at the BentoCache level.
     */
    const app = await setupApp('web', {
      cache: defineConfig({
        prefix: 'myapp', // This should NOT be passed to BentoCache
        default: 'memory',
        stores: {
          memory: store().useL1Layer(drivers.memory({})),
        },
      } as any),
    })

    const cache = await app.container.make('cache.manager')

    // If the prefix was incorrectly passed to BentoCache, this would fail
    // because BentoCache doesn't accept 'prefix' as a top-level option
    assert.isDefined(cache)
    assert.isFunction(cache.set)
    assert.isFunction(cache.get)

    // Verify the cache works correctly
    await cache.set({ key: 'test', value: 'value' })
    const result = await cache.get({ key: 'test' })
    assert.equal(result, 'value')
  })

  test('prefix should work at store level', async ({ assert }) => {
    /**
     * This test verifies that prefix works correctly at the store level
     */
    const app = await setupApp('web', {
      cache: defineConfig({
        default: 'memory',
        stores: {
          memory: store({ prefix: 'myapp' }).useL1Layer(drivers.memory({})),
        },
      }),
    })

    const cache = await app.container.make('cache.manager')

    // Verify the cache works with store-level prefix
    await cache.set({ key: 'test', value: 'value' })
    const result = await cache.get({ key: 'test' })
    assert.equal(result, 'value')
  })
})
