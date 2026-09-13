import { partitionDueTasks, updateTaskStatus } from './taskScheduler.js'

const DEFAULT_TICK_MS = 30_000

/**
 * Polls the persisted schedule and starts runs whose time has come.
 *
 * Kept as a plain interval rather than node-cron/BullMQ: the API is dependency-free
 * by design, tasks are one-shot wall-clock times (not cron expressions), and the
 * schedule already survives restarts on disk.
 */
export class TaskRunner {
    constructor({ projectRoot, pm, buildEnvForTask, tickMs = DEFAULT_TICK_MS }) {
        this.projectRoot = projectRoot
        this.pm = pm
        this.buildEnvForTask = buildEnvForTask
        this.tickMs = tickMs

        this.timer = null
        this.ticking = false
        // Task the runner handed to the process manager, so its outcome can be recorded.
        this.activeTaskId = null

        this._onExit = exit => this._finishActive(exit)
    }

    start() {
        if (this.timer) return
        this.pm.on('exit', this._onExit)
        this.timer = setInterval(() => {
            this.tick().catch(error => {
                this.pm.note('error', `Scheduler tick failed: ${error.message}`)
            })
        }, this.tickMs)
        if (typeof this.timer.unref === 'function') this.timer.unref()
    }

    stop() {
        if (this.timer) clearInterval(this.timer)
        this.timer = null
        this.pm.off('exit', this._onExit)
    }

    async tick() {
        if (this.ticking) return
        this.ticking = true
        try {
            const { due, missed } = partitionDueTasks(this.projectRoot)

            for (const task of missed) {
                this._patch(task.id, {
                    status: 'missed',
                    finishedAt: new Date().toISOString(),
                    error: 'Scheduled time passed without an available run slot.'
                })
                this.pm.note('warn', `Scheduled task ${task.id} missed its window and will not run.`)
            }

            if (!due.length) return

            // One run at a time: the bot owns the browser profile, so a second
            // concurrent run would fight over it. Remaining tasks wait for the
            // next tick and are marked missed once the grace window closes.
            if (this.pm.state !== 'idle' || this.activeTaskId) return

            const task = due[0]
            this._startTask(task)
        } finally {
            this.ticking = false
        }
    }

    _startTask(task) {
        let env
        try {
            env = this.buildEnvForTask(task)
        } catch (error) {
            this._patch(task.id, {
                status: 'failed',
                finishedAt: new Date().toISOString(),
                error: error.message
            })
            this.pm.note('error', `Scheduled task ${task.id} could not start: ${error.message}`)
            return
        }

        // Claim the task before spawning so a tick that overlaps a slow spawn
        // cannot pick it up again.
        this._patch(task.id, { status: 'running', startedAt: new Date().toISOString() })
        this.activeTaskId = task.id

        try {
            this.pm.start({ env })
            this.pm.note(
                'info',
                `Scheduled task ${task.id} started | accounts=${task.accountIndexes.join(',')} | headless=${Boolean(task.headless)}`
            )
        } catch (error) {
            this.activeTaskId = null
            const status = error.code === 'ALREADY_RUNNING' ? 'pending' : 'failed'
            this._patch(task.id, {
                status,
                startedAt: null,
                finishedAt: status === 'failed' ? new Date().toISOString() : null,
                error: status === 'failed' ? error.message : null
            })
            if (status === 'failed') {
                this.pm.note('error', `Scheduled task ${task.id} failed to start: ${error.message}`)
            }
        }
    }

    _finishActive(exit) {
        const taskId = this.activeTaskId
        if (!taskId) return
        this.activeTaskId = null

        const ok = exit?.code === 0
        this._patch(taskId, {
            status: ok ? 'done' : 'failed',
            finishedAt: new Date().toISOString(),
            error: ok ? null : `Run exited with code ${exit?.code ?? 'null'}${exit?.signal ? ` (${exit.signal})` : ''}`
        })
        this.pm.note(ok ? 'info' : 'error', `Scheduled task ${taskId} finished (${ok ? 'success' : 'failure'}).`)
    }

    _patch(taskId, patch) {
        try {
            updateTaskStatus(this.projectRoot, taskId, patch)
        } catch (error) {
            // A task deleted mid-flight is normal; anything else is worth surfacing.
            if (error.code !== 'NOT_FOUND') {
                this.pm.note('error', `Could not update task ${taskId}: ${error.message}`)
            }
        }
    }
}
