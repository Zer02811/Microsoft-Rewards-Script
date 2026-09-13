/**
 * Regression cover for CONFIG_* env overrides reaching the running bot.
 *
 * Run: node --test tests/configEnvOverrides.test.mjs
 *
 * The bug this guards: the Web UI toggles Visual Search / Edge Browsing by
 * setting CONFIG_WORKER_VISUAL_SEARCH and CONFIG_EXPERIMENTAL_EDGE_BROWSING on
 * the spawned run, but nothing merged those vars into the config the bot
 * evaluated. Only the Docker entrypoint applied them (by rewriting config.json),
 * so a locally launched run silently skipped both features.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

// Import through dist so this runs without a TS loader.
const { mergeEnvOverrides, computeOverrides, describeOverrideValue } =
    await import('../dist/util/ConfigEnvOverrides.js')

function baseConfig() {
    return {
        headless: true,
        clusters: 1,
        workers: { doVisualSearch: false, doDailySet: true },
        experimental: { edgeBrowsing: false, apiSearch: false }
    }
}

test('the two toggled features land on the config the bot reads', () => {
    const config = baseConfig()
    // Exactly what public/app.js puts in the /start payload.
    const report = mergeEnvOverrides(config, {
        CONFIG_WORKER_VISUAL_SEARCH: 'true',
        CONFIG_EXPERIMENTAL_EDGE_BROWSING: 'true'
    })

    assert.equal(config.workers.doVisualSearch, true)
    assert.equal(config.experimental.edgeBrowsing, true)
    assert.equal(report.errors.length, 0)
    assert.deepEqual(report.applied.map(entry => entry.path).sort(), [
        'experimental.edgeBrowsing',
        'workers.doVisualSearch'
    ])
})

test('toggling off overrides a config.json that has the feature on', () => {
    const config = baseConfig()
    config.workers.doVisualSearch = true
    config.experimental.edgeBrowsing = true

    mergeEnvOverrides(config, {
        CONFIG_WORKER_VISUAL_SEARCH: 'false',
        CONFIG_EXPERIMENTAL_EDGE_BROWSING: 'false'
    })

    assert.equal(config.workers.doVisualSearch, false)
    assert.equal(config.experimental.edgeBrowsing, false)
})

test('unset vars leave the file values alone', () => {
    const config = baseConfig()
    config.workers.doVisualSearch = true

    const report = mergeEnvOverrides(config, {})

    assert.equal(config.workers.doVisualSearch, true)
    assert.equal(report.applied.length, 0)
})

test('an empty string is treated as unset, not as false', () => {
    const config = baseConfig()
    config.workers.doVisualSearch = true

    mergeEnvOverrides(config, { CONFIG_WORKER_VISUAL_SEARCH: '' })

    assert.equal(config.workers.doVisualSearch, true)
})

test('shell-style booleans are accepted, not just true/false', () => {
    for (const raw of ['1', 'yes', 'on', 'TRUE', ' true ']) {
        const config = baseConfig()
        mergeEnvOverrides(config, { CONFIG_WORKER_VISUAL_SEARCH: raw })
        assert.equal(config.workers.doVisualSearch, true, `${JSON.stringify(raw)} should mean true`)
    }

    for (const raw of ['0', 'no', 'off', 'FALSE']) {
        const config = baseConfig()
        config.workers.doVisualSearch = true
        mergeEnvOverrides(config, { CONFIG_WORKER_VISUAL_SEARCH: raw })
        assert.equal(config.workers.doVisualSearch, false, `${JSON.stringify(raw)} should mean false`)
    }
})

test('one bad value does not discard the valid overrides beside it', () => {
    const config = baseConfig()
    const report = mergeEnvOverrides(config, {
        CONFIG_WORKER_VISUAL_SEARCH: 'true',
        CONFIG_CLUSTERS: 'abc'
    })

    assert.equal(config.workers.doVisualSearch, true, 'valid override must still apply')
    assert.equal(config.clusters, 1, 'rejected override must leave the file value')
    assert.equal(report.errors.length, 1)
    assert.equal(report.errors[0].env, 'CONFIG_CLUSTERS')
})

test('a rejected boolean is reported instead of silently passing', () => {
    const { errors } = computeOverrides({ CONFIG_EXPERIMENTAL_EDGE_BROWSING: 'maybe' })
    assert.equal(errors.length, 1)
    assert.match(errors[0].message, /boolean/)
})

test('FORCE_HEADLESS wins over CONFIG_HEADLESS, and is off by default', () => {
    const forced = baseConfig()
    mergeEnvOverrides(forced, { CONFIG_HEADLESS: 'false', FORCE_HEADLESS: '1' })
    assert.equal(forced.headless, true, 'containers have no display, so headless stays pinned')

    // Outside Docker the user keeps control of headless.
    const free = baseConfig()
    mergeEnvOverrides(free, { CONFIG_HEADLESS: 'false' })
    assert.equal(free.headless, false)
})

test('nested paths are created when config.json predates the key', () => {
    const config = { headless: true }
    mergeEnvOverrides(config, { CONFIG_EXPERIMENTAL_EDGE_BROWSING: 'true' })
    assert.equal(config.experimental.edgeBrowsing, true)
})

test('secret override values are masked in the applied-override log', () => {
    assert.equal(describeOverrideValue('CONFIG_DISCORD_URL', 'https://discord.com/api/webhooks/secret'), '***')
    assert.equal(describeOverrideValue('CONFIG_WORKER_VISUAL_SEARCH', true), 'true')
})
