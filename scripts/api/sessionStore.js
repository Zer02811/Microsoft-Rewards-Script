import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

function resolveSessionDb(projectRoot, sessionPath) {
    const candidates = [
        path.resolve(process.cwd(), sessionPath, 'sessions.db'),
        path.join(projectRoot, sessionPath, 'sessions.db'),
        path.join(projectRoot, 'dist', sessionPath, 'sessions.db'),
        path.join(projectRoot, 'src', sessionPath, 'sessions.db')
    ]
    const dbPath = candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0]
    return { dbPath, exists: fs.existsSync(dbPath) }
}

function openDatabase(dbPath, readOnly) {
    const db = new DatabaseSync(dbPath, { readOnly })
    db.exec('PRAGMA busy_timeout = 5000')
    return db
}

function closeDatabase(db) {
    try {
        db.close()
    } catch {}
}

// Cookies Microsoft only sets once an account is actually signed in. MUID,
// MUIDB and SRCHHPGUSR ride along on anonymous traffic too, so their presence
// proves nothing.
const AUTH_COOKIES = [
    { name: 'MSPAuth', domain: 'live.com' },
    { name: 'MSPProf', domain: 'live.com' },
    { name: 'WLSSC', domain: 'live.com' },
    { name: 'RPSSecAuth', domain: 'live.com' },
    { name: '_U', domain: 'bing.com' }
]

function normalizeCookieDomain(domain) {
    return String(domain ?? '')
        .replace(/^\./, '')
        .toLowerCase()
}

function isAuthCookie(cookie) {
    const domain = normalizeCookieDomain(cookie?.domain)
    return AUTH_COOKIES.some(
        entry => entry.name === cookie?.name && (domain === entry.domain || domain.endsWith(`.${entry.domain}`))
    )
}

// Playwright stores cookie expiry in seconds, using -1 for session cookies. A
// session cookie has no recorded expiry; that is not the same as expired.
function authCookieExpiryMs(cookie) {
    const expires = Number(cookie?.expires)
    if (!Number.isFinite(expires) || expires <= 0) return null
    return expires * 1000
}

function toIso(ms) {
    if (ms === null || !Number.isFinite(ms)) return null
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function cookieCount(storageState) {
    if (!storageState) return 0
    try {
        const parsed = JSON.parse(storageState)
        return Array.isArray(parsed?.cookies) ? parsed.cookies.length : 0
    } catch {
        return null
    }
}

function parseCookies(storageState) {
    if (!storageState) return null
    try {
        const parsed = JSON.parse(storageState)
        return Array.isArray(parsed?.cookies) ? parsed.cookies : null
    } catch {
        return null
    }
}

function inspectAuthCookies(storageState) {
    const cookies = parseCookies(storageState)
    if (cookies === null) {
        // parse failure: storage_state exists but is corrupt
        return storageState
            ? { liveCount: 0, expiredCount: 0, totalAuth: 0, nextExpiryMs: null, parseError: true }
            : { liveCount: 0, expiredCount: 0, totalAuth: 0, nextExpiryMs: null, parseError: false }
    }

    const now = Date.now()
    let liveCount = 0
    let expiredCount = 0
    let nextExpiryMs = null

    for (const cookie of cookies) {
        if (!isAuthCookie(cookie)) continue
        const expiryMs = authCookieExpiryMs(cookie)
        // null expiry means session cookie — still live, no recorded expiry
        if (expiryMs === null) {
            liveCount++
            continue
        }
        if (expiryMs > now) {
            liveCount++
            if (nextExpiryMs === null || expiryMs < nextExpiryMs) nextExpiryMs = expiryMs
        } else {
            expiredCount++
        }
    }

    return {
        liveCount,
        expiredCount,
        totalAuth: liveCount + expiredCount,
        nextExpiryMs,
        parseError: false
    }
}

function sessionAuthStatus(storageState) {
    if (!storageState) return 'not-logged-in'
    const info = inspectAuthCookies(storageState)
    if (info.parseError) return 'expired'
    if (info.liveCount > 0) return 'logged-in'
    // Has a row but no live Microsoft auth cookies — stale/expired even if
    // anonymous cookies like MUID still linger.
    if (cookieCount(storageState) > 0) return 'expired'
    return 'not-logged-in'
}

function toSession(row) {
    const updatedAt = Number(row.updated_at)
    const updatedDate = new Date(updatedAt)
    const auth = inspectAuthCookies(row.storage_state)
    return {
        email: row.email,
        platform: row.platform,
        updatedAt:
            Number.isFinite(updatedAt) && !Number.isNaN(updatedDate.getTime()) ? updatedDate.toISOString() : null,
        hasStorageState: Boolean(row.storage_state),
        hasFingerprint: Boolean(row.fingerprint),
        cookieCount: cookieCount(row.storage_state),
        authStatus: sessionAuthStatus(row.storage_state),
        liveAuthCookieCount: auth.liveCount,
        expiredAuthCookieCount: auth.expiredCount,
        nextAuthExpiry: toIso(auth.nextExpiryMs),
        parseError: auth.parseError
    }
}

export function listStoredSessions(projectRoot, sessionPath) {
    const { dbPath, exists } = resolveSessionDb(projectRoot, sessionPath)
    if (!exists) {
        return { databaseExists: false, sessions: [], count: 0, accounts: 0 }
    }

    const db = openDatabase(dbPath, true)
    try {
        const rows = db
            .prepare(
                `SELECT email, platform, storage_state, fingerprint, updated_at
                 FROM sessions
                 ORDER BY LOWER(email), platform`
            )
            .all()
        return {
            databaseExists: true,
            sessions: rows.map(toSession),
            count: rows.length,
            accounts: new Set(rows.map(row => row.email.toLowerCase())).size
        }
    } finally {
        closeDatabase(db)
    }
}

const LOGIN_RANK = { 'logged-in': 2, expired: 1, 'not-logged-in': 0 }

export function getSessionLoginStatusMap(projectRoot, sessionPath) {
    const listed = listStoredSessions(projectRoot, sessionPath)
    if (!listed.databaseExists) return null

    const map = new Map()
    for (const session of listed.sessions) {
        const key = session.email.toLowerCase()
        const current = map.get(key)
        if (!current || LOGIN_RANK[session.authStatus] > LOGIN_RANK[current.status]) {
            map.set(key, {
                status: session.authStatus,
                updatedAt: session.updatedAt,
                liveAuthCookieCount: session.liveAuthCookieCount,
                nextAuthExpiry: session.nextAuthExpiry
            })
        } else if (LOGIN_RANK[session.authStatus] === LOGIN_RANK[current.status]) {
            // Tie-break: keep the freshest row.
            const a = session.updatedAt ? Date.parse(session.updatedAt) : 0
            const b = current.updatedAt ? Date.parse(current.updatedAt) : 0
            if (a > b) {
                map.set(key, {
                    status: session.authStatus,
                    updatedAt: session.updatedAt,
                    liveAuthCookieCount: session.liveAuthCookieCount,
                    nextAuthExpiry: session.nextAuthExpiry
                })
            }
        }
    }
    return map
}

export function deleteStoredSessions(projectRoot, sessionPath, email) {
    const { dbPath, exists } = resolveSessionDb(projectRoot, sessionPath)
    if (!exists) return { found: false, removed: 0, email, platforms: [] }

    const db = openDatabase(dbPath, false)
    try {
        const matches = db
            .prepare('SELECT email, platform FROM sessions WHERE LOWER(email) = LOWER(?) ORDER BY platform')
            .all(email)

        if (!matches.length) return { found: false, removed: 0, email, platforms: [] }

        const result = db.prepare('DELETE FROM sessions WHERE LOWER(email) = LOWER(?)').run(email)
        try {
            db.prepare('DELETE FROM account_metadata WHERE LOWER(email) = LOWER(?)').run(email)
        } catch {}
        try {
            db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
        } catch {}

        return {
            found: true,
            removed: Number(result.changes ?? 0),
            email: matches[0].email,
            platforms: [...new Set(matches.map(row => row.platform))]
        }
    } finally {
        closeDatabase(db)
    }
}
