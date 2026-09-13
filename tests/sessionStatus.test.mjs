import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { getSessionLoginStatusMap, listStoredSessions } from '../scripts/api/sessionStore.js'

const SECOND = 1000
const DAY_SECONDS = 24 * 60 * 60

function secondsFromNow(days) {
    return Math.floor(Date.now() / SECOND) + days * DAY_SECONDS
}

function storageState(cookies) {
    return JSON.stringify({ cookies, origins: [] })
}

/**
 * Builds a throwaway sessions.db that looks like the one the bot writes, then
 * returns the (projectRoot, sessionPath) pair the API reader expects.
 *
 * sessionPath is randomized so resolveSessionDb cannot accidentally match the
 * real ./sessions/sessions.db relative to the test process cwd.
 */
function makeSessionDb(rows) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mrs-session-test-'))
    const sessionPath = `sessions-${path.basename(root)}`
    const dir = path.join(root, sessionPath)
    fs.mkdirSync(dir, { recursive: true })

    const db = new DatabaseSync(path.join(dir, 'sessions.db'))
    db.exec(`
        CREATE TABLE sessions (
            email         TEXT NOT NULL,
            platform      TEXT NOT NULL,
            storage_state TEXT,
            fingerprint   TEXT,
            updated_at    INTEGER NOT NULL,
            PRIMARY KEY (email, platform)
        )
    `)
    const insert = db.prepare(
        'INSERT INTO sessions (email, platform, storage_state, fingerprint, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    for (const row of rows) {
        insert.run(
            row.email,
            row.platform,
            row.storageState ?? null,
            row.fingerprint ?? null,
            row.updatedAt ?? Date.now()
        )
    }
    db.close()

    return { root, sessionPath, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) }
}

test('a live Microsoft auth cookie reports logged-in', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'live@example.com',
            platform: 'desktop',
            storageState: storageState([
                { name: 'MSPAuth', domain: '.live.com', expires: secondsFromNow(365) },
                { name: 'MUID', domain: '.bing.com', expires: secondsFromNow(365) }
            ])
        }
    ])

    try {
        const map = getSessionLoginStatusMap(root, sessionPath)
        assert.equal(map.get('live@example.com').status, 'logged-in')
        assert.equal(map.get('live@example.com').liveAuthCookieCount, 1)
    } finally {
        cleanup()
    }
})

test('anonymous cookies alone are not proof of login', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'anon@example.com',
            platform: 'desktop',
            storageState: storageState([
                { name: 'MUID', domain: '.bing.com', expires: secondsFromNow(365) },
                { name: 'SRCHHPGUSR', domain: '.bing.com', expires: secondsFromNow(365) }
            ])
        }
    ])

    try {
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('anon@example.com').status, 'expired')
    } finally {
        cleanup()
    }
})

test('an expired auth cookie reports expired, not logged-in', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'stale@example.com',
            platform: 'desktop',
            storageState: storageState([{ name: '_U', domain: '.bing.com', expires: secondsFromNow(-2) }])
        }
    ])

    try {
        const info = getSessionLoginStatusMap(root, sessionPath).get('stale@example.com')
        assert.equal(info.status, 'expired')
        assert.equal(info.liveAuthCookieCount, 0)
    } finally {
        cleanup()
    }
})

test('a session cookie (expires -1) still counts as live', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'session-cookie@example.com',
            platform: 'mobile',
            storageState: storageState([{ name: 'WLSSC', domain: '.live.com', expires: -1 }])
        }
    ])

    try {
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('session-cookie@example.com').status, 'logged-in')
    } finally {
        cleanup()
    }
})

test('a row with no storage state reports not-logged-in', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        { email: 'empty@example.com', platform: 'desktop', storageState: null }
    ])

    try {
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('empty@example.com').status, 'not-logged-in')
    } finally {
        cleanup()
    }
})

test('the best platform wins when desktop and mobile disagree', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'mixed@example.com',
            platform: 'desktop',
            storageState: storageState([{ name: 'MSPAuth', domain: '.live.com', expires: secondsFromNow(-1) }]),
            updatedAt: Date.now() - 60_000
        },
        {
            email: 'mixed@example.com',
            platform: 'mobile',
            storageState: storageState([{ name: 'MSPAuth', domain: '.live.com', expires: secondsFromNow(30) }]),
            updatedAt: Date.now()
        }
    ])

    try {
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('mixed@example.com').status, 'logged-in')
    } finally {
        cleanup()
    }
})

test('email lookups are case-insensitive', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        {
            email: 'MixedCase@Example.com',
            platform: 'desktop',
            storageState: storageState([{ name: 'MSPProf', domain: '.live.com', expires: secondsFromNow(10) }])
        }
    ])

    try {
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('mixedcase@example.com').status, 'logged-in')
    } finally {
        cleanup()
    }
})

test('corrupt storage state is reported as expired rather than throwing', () => {
    const { root, sessionPath, cleanup } = makeSessionDb([
        { email: 'corrupt@example.com', platform: 'desktop', storageState: '{not json' }
    ])

    try {
        const listed = listStoredSessions(root, sessionPath)
        assert.equal(listed.sessions[0].parseError, true)
        assert.equal(getSessionLoginStatusMap(root, sessionPath).get('corrupt@example.com').status, 'expired')
    } finally {
        cleanup()
    }
})

test('a missing database yields null so callers can leave status untouched', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mrs-session-missing-'))
    try {
        assert.equal(getSessionLoginStatusMap(root, `sessions-${path.basename(root)}`), null)
    } finally {
        fs.rmSync(root, { recursive: true, force: true })
    }
})
