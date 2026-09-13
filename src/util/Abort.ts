/**
 * Run-wide cancellation.
 *
 * The API stops a run by signalling the process (SIGTERM, then SIGKILL on a
 * timeout). Chromium is a child of this process, so the OS-level kill already
 * prevents zombies. What the signal alone does NOT do is give the run a chance
 * to close browsers cleanly, so this registry exists to:
 *   - expose an AbortSignal that long loops can poll to bail out early, and
 *   - close every live browser (saving nothing, just releasing the processes)
 *     before we exit, so no Chromium outlives us if it ever escaped the tree.
 */

type Closable = { close: () => Promise<unknown> }

const controller = new AbortController()
const browsers = new Set<Closable>()

/** Signal that flips when the user aborts the run. */
export const abortSignal: AbortSignal = controller.signal

export function isAborted(): boolean {
    return controller.signal.aborted
}

/** Throws if the run was aborted. Call between steps to unwind promptly. */
export function throwIfAborted(): void {
    if (controller.signal.aborted) {
        throw new AbortError()
    }
}

export class AbortError extends Error {
    constructor() {
        super('Process aborted by user')
        this.name = 'AbortError'
    }
}

export function isAbortError(error: unknown): boolean {
    return error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')
}

/** Track a launched browser so abort can force it closed. */
export function registerBrowser(browser: Closable): void {
    browsers.add(browser)
}

export function unregisterBrowser(browser: Closable): void {
    browsers.delete(browser)
}

/**
 * Flip the signal and force every tracked browser closed. Safe to call twice.
 * Returns how many browsers it closed so the caller can log it.
 */
export async function abortRun(): Promise<number> {
    controller.abort()

    const pending = [...browsers]
    browsers.clear()

    // close() rejects if the browser already died; that is the outcome we want anyway.
    await Promise.allSettled(pending.map(browser => browser.close()))
    return pending.length
}
