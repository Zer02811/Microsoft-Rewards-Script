import fs from 'node:fs'
import path from 'node:path'

import { accountIndexesFromEnv } from '../env.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function envFilePath(projectRoot) {
    return path.join(projectRoot, '.env')
}

// Re-parse .env from disk into process.env so the long-lived API server sees
// accounts added after it started. ACCOUNT_* keys are overwritten (not skipped
// like on first boot) because the file is the source of truth for them.
export function reloadEnvAccounts(projectRoot) {
    const file = envFilePath(projectRoot)
    if (!fs.existsSync(file)) return

    for (const key of Object.keys(process.env)) {
        if (/^ACCOUNT_\d+_/.test(key)) delete process.env[key]
    }

    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        if (!/^ACCOUNT_\d+_/.test(key)) continue
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        process.env[key] = value
    }
}

// Removes every ACCOUNT_N_* line for one index - the email and any proxy block -
// leaving the file otherwise intact. The index is never recycled: addAccountToEnv
// picks max(existing) + 1, so the next account added after a removal gets a fresh
// number rather than inheriting the session cookies of the deleted one.
export function removeAccountFromEnv(projectRoot, index) {
    const i = Number(index)
    if (!Number.isSafeInteger(i) || i < 1) {
        throw Object.assign(new Error('A positive account index is required.'), { code: 'BAD_REQUEST' })
    }

    reloadEnvAccounts(projectRoot)
    if (!process.env[`ACCOUNT_${i}_EMAIL`]) {
        throw Object.assign(new Error(`ACCOUNT_${i} is not configured.`), { code: 'UNKNOWN_ACCOUNT' })
    }

    const file = envFilePath(projectRoot)
    const prefix = `ACCOUNT_${i}_`
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const lines = before.split(/\r?\n/)
    // Keep one trailing empty line so the file still ends with a newline.
    const kept = lines.filter(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return true
        const eq = trimmed.indexOf('=')
        return eq === -1 || !trimmed.slice(0, eq).trim().startsWith(prefix)
    })

    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, kept.join('\n'))
    fs.renameSync(tmp, file)

    reloadEnvAccounts(projectRoot)
    return { index: i, envPath: file }
}

export function addAccountToEnv(projectRoot, email) {
    const normalized = String(email ?? '').trim()
    if (!normalized || normalized.length > 320 || !EMAIL_RE.test(normalized)) {
        throw Object.assign(new Error('A valid email address is required.'), { code: 'BAD_REQUEST' })
    }

    reloadEnvAccounts(projectRoot)

    const existing = accountIndexesFromEnv().find(
        i => process.env[`ACCOUNT_${i}_EMAIL`]?.toLowerCase() === normalized.toLowerCase()
    )
    if (existing) {
        throw Object.assign(new Error(`${normalized} is already configured as ACCOUNT_${existing}.`), {
            code: 'DUPLICATE'
        })
    }

    const used = accountIndexesFromEnv()
    const index = used.length ? Math.max(...used) + 1 : 1

    const file = envFilePath(projectRoot)
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    const separator = before.length === 0 || before.endsWith('\n') ? '' : '\n'
    fs.appendFileSync(file, `${separator}\nACCOUNT_${index}_EMAIL=${normalized}\n`, 'utf8')

    process.env[`ACCOUNT_${index}_EMAIL`] = normalized
    return { index, email: normalized, envPath: file }
}
