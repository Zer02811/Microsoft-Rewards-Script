import fs from 'node:fs'
import path from 'node:path'

// Per-account proxy editing for the Web UI. Mirrors the rules the bot enforces
// in src/util/Validator.ts (AccountProxySchema) and src/util/Proxy.ts, so a
// proxy saved through the API can never make the next run fail validation.
// Stored as ACCOUNT_N_PROXY_* lines in .env; the password is never returned.

const PROXY_PROTOCOLS = ['http', 'https', 'socks4', 'socks5']
const TRUE_WORDS = ['1', 'true', 'yes', 'on']

function badRequest(message) {
    return Object.assign(new Error(message), { code: 'BAD_REQUEST' })
}

function envFilePath(projectRoot) {
    return path.join(projectRoot, '.env')
}

function accountPrefix(index) {
    return `ACCOUNT_${index}_`
}

// Same acceptance rules as src/util/Proxy.ts: a bare hostname means http://.
export function parseProxyUrl(value) {
    const input = String(value ?? '').trim()
    if (!input) throw badRequest('Proxy URL is empty')

    let url
    try {
        url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `http://${input}`)
    } catch {
        throw badRequest(`Invalid proxy URL: ${value}`)
    }

    const protocol = url.protocol.toLowerCase().slice(0, -1)
    if (!PROXY_PROTOCOLS.includes(protocol)) {
        throw badRequest(`Unsupported proxy protocol "${protocol}"; supported: ${PROXY_PROTOCOLS.join(', ')}`)
    }
    if (!url.hostname) throw badRequest(`Invalid proxy URL: ${value}`)
    return url
}

function parseEnvFile(projectRoot) {
    const file = envFilePath(projectRoot)
    if (!fs.existsSync(file)) return []
    return fs.readFileSync(file, 'utf8').split(/\r?\n/)
}

function activeValue(line) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return null
    const eq = trimmed.indexOf('=')
    if (eq === -1) return null
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
    }
    return { key, value }
}

export function readAccountProxy(projectRoot, index) {
    const prefix = accountPrefix(index)
    const raw = { PROXY_HTTP: 'false', PROXY_URL: '', PROXY_PORT: '0', PROXY_USERNAME: '', PROXY_PASSWORD: '' }

    for (const line of parseEnvFile(projectRoot)) {
        const entry = activeValue(line)
        if (!entry || !entry.key.startsWith(prefix)) continue
        const suffix = entry.key.slice(prefix.length)
        if (suffix in raw) raw[suffix] = entry.value
    }

    return {
        proxyHttp: TRUE_WORDS.includes(raw.PROXY_HTTP.trim().toLowerCase()),
        url: raw.PROXY_URL,
        port: Number.parseInt(raw.PROXY_PORT, 10) || 0,
        username: raw.PROXY_USERNAME,
        hasPassword: raw.PROXY_PASSWORD.length > 0
    }
}

/**
 * Validates a PUT body against the same rules AccountProxySchema enforces.
 * A blank password keeps the stored one (returns password: null) as long as
 * the username is unchanged, so the UI never has to echo secrets back.
 */
export function validateProxyInput(body, existing = {}) {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw badRequest('Body must be a JSON object.')
    }

    const url = String(body.url ?? '').trim()
    const proxyHttp = Boolean(body.proxyHttp)
    const username = String(body.username ?? '').trim()
    const rawPassword = body.password == null ? '' : String(body.password)
    const portGiven = body.port !== undefined && body.port !== null && body.port !== ''

    if (!url) {
        const port = portGiven ? Number(body.port) : 0
        if (proxyHttp || username || rawPassword || (portGiven && port !== 0)) {
            throw badRequest('Proxy URL is required when other proxy settings are configured')
        }
        return { proxyHttp: false, url: '', port: 0, username: '', password: '' }
    }

    const parsed = parseProxyUrl(url)
    if (parsed.username || parsed.password) {
        throw badRequest('Put proxy credentials in the username/password fields, not in the proxy URL')
    }

    const port = Number(body.port)
    if (!portGiven || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw badRequest('Proxy port must be an integer from 1 to 65535')
    }

    const keepStored = rawPassword === '' && existing.hasPassword && existing.username === username
    const password = keepStored ? null : rawPassword
    const hasPassword = password === null ? true : password.length > 0

    if (Boolean(username) !== hasPassword) {
        throw badRequest('Proxy username and password must be configured together')
    }

    const protocol = parsed.protocol.slice(0, -1)
    if ((protocol === 'socks4' || protocol === 'socks5') && (username || hasPassword)) {
        throw badRequest(`${protocol.toUpperCase()} proxy authentication is not supported by Patchright`)
    }

    return { proxyHttp, url: `${parsed.protocol}//${parsed.hostname}`, port, username, password }
}

export function writeAccountProxy(projectRoot, index, proxy) {
    const prefix = accountPrefix(index)
    const lines = parseEnvFile(projectRoot)

    // password: null means "keep whatever is already stored".
    let password = proxy.password
    if (password === null) {
        password = ''
        for (const line of lines) {
            const entry = activeValue(line)
            if (entry?.key === `${prefix}PROXY_PASSWORD`) password = entry.value
        }
    }

    const block = [
        `${prefix}PROXY_HTTP=${proxy.proxyHttp}`,
        `${prefix}PROXY_URL=${proxy.url}`,
        `${prefix}PROXY_PORT=${proxy.port}`,
        `${prefix}PROXY_USERNAME=${proxy.username}`,
        `${prefix}PROXY_PASSWORD=${password}`
    ]

    // Replace active PROXY_* lines in place; commented examples stay untouched.
    let insertAt = -1
    const kept = []
    for (const line of lines) {
        const entry = activeValue(line)
        if (entry && entry.key.startsWith(`${prefix}PROXY_`)) {
            if (insertAt === -1) insertAt = kept.length
            continue
        }
        kept.push(line)
    }
    if (insertAt === -1) insertAt = kept.length
    kept.splice(insertAt, 0, ...block)

    const file = envFilePath(projectRoot)
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, kept.join('\n'))
    fs.renameSync(tmp, file)
    return file
}
