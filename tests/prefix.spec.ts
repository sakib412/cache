/*
 * @adonisjs/cache
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { defineConfig as defineRedisConfig } from '@adonisjs/redis'

import { setupApp } from './helpers.js'
import { defineConfig, drivers, store } from '../index.js'

test.group('Prefix config', () => {
  test('global prefix in defineConfig should be used by drivers when not explicitly set', async ({
    assert,
  }) => {
    /**
     * This test verifies that when a user passes 'prefix' in defineConfig,
     * it gets used by BentoCache and drivers respect it when they don't have
     * their own prefix set.
     */
    const app = await setupApp('web', {
      redis: defineRedisConfig({
        connection: 'local',
        connections: { local: { host: '127.0.0.1', port: 6379 } },
      }),
      cache: defineConfig({
        prefix: 'myapp', // Global prefix
        default: 'redis',
        stores: {
          redis: store().useL2Layer(drivers.redis({ connectionName: 'local' as any })),
        },
      }),
    })

    const redis = await app.container.make('redis')
    const cache = await app.container.make('cache.manager')

    // Set a value through cache
    await cache.set({ key: 'test', value: 'value' })

    // The key should be prefixed with 'myapp' (from global config), not 'bentocache'
    const result = await redis.get('myapp:test')

    assert.isDefined(result)
    assert.equal(JSON.parse(result!).value, 'value')

    // Cleanup: verify the key is NOT under the old 'bentocache' prefix
    const oldPrefixResult = await redis.get('bentocache:test')
    assert.isNull(oldPrefixResult)
  })

  test('driver-level prefix should override global prefix', async ({ assert }) => {
    /**
     * This test verifies that a driver-specific prefix takes precedence
     * over the global prefix.
     */
    const app = await setupApp('web', {
      redis: defineRedisConfig({
        connection: 'local',
        connections: { local: { host: '127.0.0.1', port: 6379 } },
      }),
      cache: defineConfig({
        prefix: 'myapp', // Global prefix
        default: 'redis',
        stores: {
          redis: store().useL2Layer(
            drivers.redis({ connectionName: 'local' as any, prefix: 'custom' })
          ),
        },
      }),
    })

    const redis = await app.container.make('redis')
    const cache = await app.container.make('cache.manager')

    // Set a value through cache
    await cache.set({ key: 'test2', value: 'value2' })

    // The key should be prefixed with 'custom' (from driver config), not 'myapp'
    const result = await redis.get('custom:test2')

    assert.isDefined(result)
    assert.equal(JSON.parse(result!).value, 'value2')

    // Cleanup: verify the key is NOT under the global prefix
    const globalPrefixResult = await redis.get('myapp:test2')
    assert.isNull(globalPrefixResult)
  })

  test('store-level prefix should be used', async ({ assert }) => {
    /**
     * This test verifies that a store-specific prefix works correctly.
     */
    const app = await setupApp('web', {
      redis: defineRedisConfig({
        connection: 'local',
        connections: { local: { host: '127.0.0.1', port: 6379 } },
      }),
      cache: defineConfig({
        default: 'redis',
        stores: {
          redis: store({ prefix: 'storeprefix' }).useL2Layer(
            drivers.redis({ connectionName: 'local' as any })
          ),
        },
      }),
    })

    const redis = await app.container.make('redis')
    const cache = await app.container.make('cache.manager')

    // Set a value through cache
    await cache.set({ key: 'test3', value: 'value3' })

    // The key should be prefixed with 'storeprefix'
    const result = await redis.get('storeprefix:test3')

    assert.isDefined(result)
    assert.equal(JSON.parse(result!).value, 'value3')
  })
})
