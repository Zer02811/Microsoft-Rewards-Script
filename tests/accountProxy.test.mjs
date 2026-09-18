/**
 * Regression cover for Web UI proxy editing.
 *
 * Run: node --test tests/accountProxy.test.mjs
 *
 * The rules asserted here mirror src/util/Validator.ts (AccountProxySchema) and
 * src/util/Proxy.ts. If the API accepted something the bot rejects, the next run
 * would die at account validation with no hint that the UI was the cause.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const { readAccountProxy, validateProxyInput, writeAccountProxy, parseProxyUrl } =
    await import('../scripts/api/accountProxy.js')

function tempRoot(envBody = '') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-test-'))
    if (envBody) fs.writeFileSync(path.join(dir, '.env'), envBody)
    return dir
}

function readEnv(root) {
    return fs.readFileSync(path.join(root, '.env'), 'utf8')
}

// ── URL parsing ──

test('a bare hostname is treated as http, matching the bot', () => {
    const parsed = parseProxyUrl('proxy.example.com')
    assert.equal(parsed.protocol, 'http:')
    assert.equal(parsed.hostname, 'proxy.example.com')
})

test('all four browser protocols are accepted', () => {
    for (const scheme of ['http', 'https', 'socks4', 'socks5']) {
        const parsed = parseProxyUrl(`${scheme}://proxy.example.com`)
        assert.equal(parsed.protocol, `${scheme}:`)
    }
})

test('unsupported protocols are rejected with a helpful message', () => {
    assert.throws(() => parseProxyUrl('ftp://proxy.example.com'), /Unsupported proxy protocol/)
})

test('a malformed URL is rejected', () => {
    assert.throws(() => parseProxyUrl('http://'), /Invalid proxy URL/)
})

// ── Validation rules ──

test('a disabled proxy needs no URL and clears every field', () => {
    const proxy = validateProxyInput({ url: '', proxyHttp: false })
    assert.deepEqual(proxy, { proxyHttp: false, url: '', port: 0, username: '', password: '' })
})

test('a port without a URL is rejected, as the bot rejects it', () => {
    assert.throws(() => validateProxyInput({ url: '', port: 8080 }), /Proxy URL is required/)
})

test('credentials in the URL are rejected', () => {
    assert.throws(
        () => validateProxyInput({ url: 'http://user:pass@proxy.example.com', port: 8080 }),
        /username\/password fields/
    )
})

test('a missing or out-of-range port is rejected', () => {
    assert.throws(() => validateProxyInput({ url: 'http://p.example.com' }), /port must be an integer/)
    assert.throws(() => validateProxyInput({ url: 'http://p.example.com', port: 70000 }), /port must be an integer/)
    assert.throws(() => validateProxyInput({ url: 'http://p.example.com', port: 0 }), /port must be an integer/)
})

test('a username without a password is rejected', () => {
    assert.throws(
        () => validateProxyInput({ url: 'http://p.example.com', port: 8080, username: 'user' }),
        /configured together/
    )
})

test('SOCKS proxies cannot use authentication', () => {
    assert.throws(
        () => validateProxyInput({ url: 'socks5://p.example.com', port: 1080, username: 'u', password: 'p' }),
        /not supported by Patchright/
    )
})

test('an authenticated HTTP proxy is accepted and normalised', () => {
    const proxy = validateProxyInput({
        url: 'https://Proxy.Example.com',
        port: 8443,
        username: 'user',
        password: 'secret',
        proxyHttp: true
    })
    assert.equal(proxy.url, 'https://proxy.example.com')
    assert.equal(proxy.port, 8443)
    assert.equal(proxy.username, 'user')
    assert.equal(proxy.password, 'secret')
    assert.equal(proxy.proxyHttp, true)
})

test('a blank password keeps the stored one when the username is unchanged', () => {
    const existing = { hasPassword: true, username: 'user' }
    const proxy = validateProxyInput({ url: 'http://p.example.com', port: 8080, username: 'user' }, existing)
    assert.equal(proxy.password, null, 'null means keep what is on disk')
})

test('a blank password does not keep the old one when the username changed', () => {
    const existing = { hasPassword: true, username: 'old-user' }
    assert.throws(
        () => validateProxyInput({ url: 'http://p.example.com', port: 8080, username: 'new-user' }, existing),
        /configured together/
    )
})

// ── .env read/write ──

test('writing then reading a proxy round-trips', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\n')

    writeAccountProxy(root, 1, {
        proxyHttp: true,
        url: 'http://proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'secret'
    })

    const proxy = readAccountProxy(root, 1)
    assert.equal(proxy.url, 'http://proxy.example.com')
    assert.equal(proxy.port, 8080)
    assert.equal(proxy.username, 'user')
    assert.equal(proxy.hasPassword, true)
    assert.equal(proxy.proxyHttp, true)
})

test('the password is never returned, only whether one exists', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\n')
    writeAccountProxy(root, 1, {
        proxyHttp: false,
        url: 'http://p.example.com',
        port: 8080,
        username: 'u',
        password: 'topsecret'
    })

    const proxy = readAccountProxy(root, 1)
    assert.equal('password' in proxy, false)
    assert.equal(JSON.stringify(proxy).includes('topsecret'), false)
})

test('password: null preserves the stored password on disk', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\n')
    writeAccountProxy(root, 1, {
        proxyHttp: false,
        url: 'http://p.example.com',
        port: 8080,
        username: 'u',
        password: 'keepme'
    })

    writeAccountProxy(root, 1, {
        proxyHttp: false,
        url: 'http://p.example.com',
        port: 9090,
        username: 'u',
        password: null
    })

    assert.match(readEnv(root), /ACCOUNT_1_PROXY_PASSWORD=keepme/)
    assert.equal(readAccountProxy(root, 1).port, 9090)
})

test('saving twice edits lines in place instead of appending duplicates', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\n')
    const proxy = { proxyHttp: false, url: 'http://p.example.com', port: 8080, username: '', password: '' }
    writeAccountProxy(root, 1, proxy)
    writeAccountProxy(root, 1, proxy)

    const env = readEnv(root)
    for (const suffix of ['PROXY_HTTP', 'PROXY_URL', 'PROXY_PORT', 'PROXY_USERNAME', 'PROXY_PASSWORD']) {
        const hits = env.split('\n').filter(line => line.startsWith(`ACCOUNT_1_${suffix}=`))
        assert.equal(hits.length, 1, `${suffix} should appear exactly once`)
    }
})

test('the account email line is left intact', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=keep@example.com\n')
    writeAccountProxy(root, 1, { proxyHttp: false, url: '', port: 0, username: '', password: '' })
    assert.match(readEnv(root), /ACCOUNT_1_EMAIL=keep@example\.com/)
})

test('commentator example lines are not treated as configuration', () => {
    const root = tempRoot('#ACCOUNT_1_PROXY_URL=\nACCOUNT_1_EMAIL=a@example.com\n')
    assert.equal(readAccountProxy(root, 1).url, '')
})

test('accounts are independent of one another', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\nACCOUNT_2_EMAIL=b@example.com\n')
    writeAccountProxy(root, 2, {
        proxyHttp: false,
        url: 'http://two.example.com',
        port: 3128,
        username: '',
        password: ''
    })

    assert.equal(readAccountProxy(root, 1).url, '')
    assert.equal(readAccountProxy(root, 2).url, 'http://two.example.com')
})

test('a cleared proxy reads back as disabled', () => {
    const root = tempRoot('ACCOUNT_1_EMAIL=a@example.com\n')
    writeAccountProxy(root, 1, { proxyHttp: false, url: '', port: 0, username: '', password: '' })

    const proxy = readAccountProxy(root, 1)
    assert.equal(proxy.url, '')
    assert.equal(proxy.port, 0)
    assert.equal(proxy.proxyHttp, false)
    assert.equal(proxy.hasPassword, false)
})

test('PROXY_HTTP accepts the same boolean words the bot accepts', () => {
    for (const word of ['1', 'true', 'yes', 'on', 'TRUE']) {
        const root = tempRoot(`ACCOUNT_1_EMAIL=a@example.com\nACCOUNT_1_PROXY_HTTP=${word}\n`)
        assert.equal(readAccountProxy(root, 1).proxyHttp, true, `${word} should mean true`)
    }
    for (const word of ['0', 'false', 'no', 'off']) {
        const root = tempRoot(`ACCOUNT_1_EMAIL=a@example.com\nACCOUNT_1_PROXY_HTTP=${word}\n`)
        assert.equal(readAccountProxy(root, 1).proxyHttp, false, `${word} should mean false`)
    }
})
