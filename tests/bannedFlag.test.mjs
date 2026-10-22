import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { isAccountBanned, setAccountBanned, closeSessionStore } from '../dist/util/SessionStore.js'
import { getBannedAccountsMap } from '../scripts/api/sessionStore.js'

function tempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'banned-flag-'))
}

test('banned flag round-trips and is visible to the API map', () => {
    const dir = tempDir()
    const email = 'user@example.com'

    const originalCwd = process.cwd()
    try {
        assert.equal(isAccountBanned(dir, email), false)

        setAccountBanned(dir, email, true)
        assert.equal(isAccountBanned(dir, email), true)

        // The API resolves the DB relative to cwd, so run it from the temp dir.
        process.chdir(dir)
        assert.equal(getBannedAccountsMap(dir, '.')?.get(email.toLowerCase()), true)

        setAccountBanned(dir, email, false)
        assert.equal(isAccountBanned(dir, email), false)
        assert.equal(getBannedAccountsMap(dir, '.'), null)
    } finally {
        process.chdir(originalCwd)
        closeSessionStore()
    }
})

test('legacy database without the banned column is migrated in place', () => {
    const dir = tempDir()
    const db = new DatabaseSync(path.join(dir, 'sessions.db'))
    db.exec(`
        CREATE TABLE IF NOT EXISTS account_metadata (
            email TEXT PRIMARY KEY COLLATE NOCASE,
            resolved_region TEXT,
            updated_at INTEGER NOT NULL
        )
    `)
    db.close()

    const email = 'legacy@example.com'
    try {
        setAccountBanned(dir, email, true)
        assert.equal(isAccountBanned(dir, email), true)
    } finally {
        closeSessionStore()
    }
})
