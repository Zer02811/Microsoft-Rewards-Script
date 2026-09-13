import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const SCHEDULE_FILE = 'scheduled_tasks.json'

// How long a finished task stays visible in the UI before it is pruned.
const RETENTION_MS = 24 * 60 * 60 * 1000

// A task that could not start within this window after its time (server was off,
// or another run was in progress the whole time) is marked missed instead of
// firing hours late.
const MISS_GRACE_MS = 60 * 60 * 1000

const TERMINAL = new Set(['done', 'failed', 'missed', 'cancelled'])

function filePathFor(projectRoot) {
    return join(projectRoot, SCHEDULE_FILE)
}

function normalizeTask(task) {
    return {
        status: 'pending',
        startedAt: null,
        finishedAt: null,
        error: null,
        ...task
    }
}

function isExpired(task, now) {
    if (!TERMINAL.has(task.status)) return false
    const endedAt = Date.parse(task.finishedAt ?? task.scheduledAt)
    if (Number.isNaN(endedAt)) return false
    return now - endedAt > RETENTION_MS
}

/**
 * Reads the persisted tasks. Past-due tasks are kept - the runner needs to see
 * them to fire or expire them - and only long-finished ones are pruned.
 */
export function readScheduledTasks(projectRoot) {
    const filePath = filePathFor(projectRoot)

    if (!existsSync(filePath)) {
        return { tasks: [] }
    }

    let data
    try {
        data = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch {
        return { tasks: [] }
    }

    const stored = Array.isArray(data?.tasks) ? data.tasks : []
    const now = Date.now()
    const tasks = stored.map(normalizeTask).filter(task => !isExpired(task, now))

    if (tasks.length !== stored.length) {
        writeScheduledTasks(projectRoot, tasks)
    }

    tasks.sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    return { tasks }
}

export function writeScheduledTasks(projectRoot, tasks) {
    const filePath = filePathFor(projectRoot)
    const data = { tasks, updatedAt: new Date().toISOString() }

    try {
        // Write-then-rename so a crash mid-write cannot truncate the schedule.
        const tmpPath = `${filePath}.tmp`
        writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
        renameSync(tmpPath, filePath)
        return data
    } catch (error) {
        const err = new Error(`Failed to write scheduled tasks: ${error.message}`)
        err.code = 'WRITE_FAILED'
        throw err
    }
}

export function addScheduledTask(projectRoot, task) {
    const { tasks } = readScheduledTasks(projectRoot)

    const newTask = normalizeTask({
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        ...task,
        createdAt: new Date().toISOString()
    })

    tasks.push(newTask)
    writeScheduledTasks(projectRoot, tasks)

    return newTask
}

export function removeScheduledTask(projectRoot, taskId) {
    const { tasks } = readScheduledTasks(projectRoot)
    const filtered = tasks.filter(task => task.id !== taskId)

    if (filtered.length === tasks.length) {
        const err = new Error(`Task ${taskId} not found`)
        err.code = 'NOT_FOUND'
        throw err
    }

    writeScheduledTasks(projectRoot, filtered)
    return { deleted: true, taskId }
}

/**
 * Returns tasks whose time has arrived and that are still waiting to run,
 * oldest first, plus the ones that sat unstarted past the grace window.
 */
export function partitionDueTasks(projectRoot, now = Date.now()) {
    const { tasks } = readScheduledTasks(projectRoot)
    const due = []
    const missed = []

    for (const task of tasks) {
        if (task.status !== 'pending') continue
        const at = Date.parse(task.scheduledAt)
        if (Number.isNaN(at) || at > now) continue
        if (now - at > MISS_GRACE_MS) missed.push(task)
        else due.push(task)
    }

    return { due, missed }
}

/**
 * Flips a task to a new status in one read-modify-write so the runner never
 * starts the same task twice.
 */
export function updateTaskStatus(projectRoot, taskId, patch) {
    const { tasks } = readScheduledTasks(projectRoot)
    const index = tasks.findIndex(task => task.id === taskId)

    if (index === -1) {
        const err = new Error(`Task ${taskId} not found`)
        err.code = 'NOT_FOUND'
        throw err
    }

    const updated = { ...tasks[index], ...patch }
    tasks[index] = updated
    writeScheduledTasks(projectRoot, tasks)

    return updated
}
