/**
 * Self-check for the run-abort path.
 *
 * Run: node --test tests/abort.test.js
 *
 * Covers the two things that actually break in the wild:
 *   1. abortRun() closes every registered browser, so none survive a Stop.
 *   2. ProcessManager.stop() asks for a graceful abort before killing the tree,
 *      because a bare taskkill leaves the bot no chance to close Chromium.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { ABORT_SENTINEL, ProcessManager } from '../scripts/api/processManager.js'

test('abortRun closes every registered browser and flips the signal', async () => {
    // Import through dist so this runs without a TS loader.
    const { abortRun, abortSignal, isAborted, registerBrowser } = await import('../dist/util/Abort.js')

    const closed = []
    const fakeBrowser = name => ({
        close: async () => {
            closed.push(name)
        }
    })

    registerBrowser(fakeBrowser('mobile'))
    registerBrowser(fakeBrowser('desktop'))

    assert.equal(isAborted(), false, 'signal should start un-aborted')

    const count = await abortRun()

    assert.equal(count, 2, 'should report both browsers closed')
    assert.deepEqual(closed.sort(), ['desktop', 'mobile'])
    assert.equal(abortSignal.aborted, true, 'signal must flip so loops bail out')
    assert.equal(isAborted(), true)

    // Idempotent: a second Stop click must not throw or double-close.
    assert.equal(await abortRun(), 0)
})

test('a browser that fails to close does not break the abort', async () => {
    const { abortRun, registerBrowser } = await import('../dist/util/Abort.js')

    registerBrowser({
        close: async () => {
            throw new Error('browser already gone')
        }
    })

    // Must resolve, not reject - a dead browser is the outcome we wanted anyway.
    assert.equal(await abortRun(), 1)
})

test('stop() requests a graceful abort before killing the tree', async () => {
    const pm = new ProcessManager({
        command: process.execPath,
        // Ignores stdin and stays alive, so we can observe the abort request.
        args: ['-e', 'setTimeout(() => {}, 60_000)'],
        cwd: process.cwd(),
        stopTimeoutMs: 1500
    })

    pm.start()
    await new Promise(resolve => pm.once('status', resolve))

    const written = []
    const realWrite = pm.child.stdin.write.bind(pm.child.stdin)
    pm.child.stdin.write = chunk => {
        written.push(String(chunk))
        return realWrite(chunk)
    }

    const exit = pm.stop({ force: false })

    assert.ok(
        written.some(chunk => chunk.includes(ABORT_SENTINEL)),
        'stop() should write the abort sentinel to stdin'
    )

    // The child ignores the sentinel, so the kill timer must still finish the job.
    await exit
    assert.equal(pm.getStatus().state, 'idle', 'server must settle back to idle, not hang')
})

test('force stop skips the graceful path', async () => {
    const pm = new ProcessManager({
        command: process.execPath,
        args: ['-e', 'setTimeout(() => {}, 60_000)'],
        cwd: process.cwd(),
        stopTimeoutMs: 1500
    })

    pm.start()
    await new Promise(resolve => pm.once('status', resolve))

    const written = []
    const realWrite = pm.child.stdin.write.bind(pm.child.stdin)
    pm.child.stdin.write = chunk => {
        written.push(String(chunk))
        return realWrite(chunk)
    }

    await pm.stop({ force: true })

    assert.equal(
        written.some(chunk => chunk.includes(ABORT_SENTINEL)),
        false,
        'force stop should kill immediately without asking'
    )
    assert.equal(pm.getStatus().state, 'idle')
})
