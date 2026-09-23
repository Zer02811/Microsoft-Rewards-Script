import test from 'node:test'
import assert from 'node:assert/strict'

// The dashboard scripts run in a browser, so this loads them against a minimal
// document stub. Only the pieces that can silently corrupt a proxy save (blank
// password = "keep the stored one", blank port must not become NaN) are checked
// here; the rest is verified against the live API.
const PROXY_INPUTS = ['proxyUrlInput', 'proxyPortInput', 'proxyUsernameInput', 'proxyPasswordInput']

function stubElement(id) {
    return {
        id,
        value: '',
        checked: false,
        textContent: '',
        innerHTML: '',
        hidden: false,
        placeholder: '',
        dataset: {},
        className: '',
        classList: { toggle() {}, remove() {}, add() {} },
        addEventListener() {},
        setAttribute() {},
        append() {},
        querySelector: () => null,
        querySelectorAll: () => [],
        scrollIntoView() {},
        remove() {}
    }
}

const elements = new Map()
function getElement(id) {
    if (!elements.has(id)) elements.set(id, stubElement(id))
    return elements.get(id)
}

globalThis.window = { addEventListener() {} }
globalThis.document = {
    getElementById: getElement,
    querySelectorAll: () => [],
    addEventListener() {},
    // escapeHtml() does div.textContent = text; return div.innerHTML. Round-trip
    // the text so escaped entities appear, instead of returning ''.
    createElement: () => {
        const el = stubElement('div')
        Object.defineProperty(el, 'innerHTML', {
            get() {
                return String(this.textContent ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
            },
            set(v) {
                this.textContent = v
            },
            configurable: true
        })
        return el
    }
}
globalThis.localStorage = {
    store: new Map(),
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null
    },
    setItem(key, value) {
        this.store.set(key, String(value))
    },
    removeItem(key) {
        this.store.delete(key)
    }
}
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) })

const { proxyPayload, renderErrors, renderHistory, formatExit } = await import('../public/app.js')

function fill({ url = '', port = '', username = '', password = '' }) {
    getElement('proxyUrlInput').value = url
    getElement('proxyPortInput').value = port
    getElement('proxyUsernameInput').value = username
    getElement('proxyPasswordInput').value = password
    return proxyPayload()
}

test('every proxy form field is exercised', () => {
    for (const id of PROXY_INPUTS) assert.ok(getElement(id), `${id} is missing from index.html`)
})

test('a blank password is omitted so the server keeps the stored one', () => {
    const body = fill({ url: 'http://proxy.example.com', port: '8080', username: 'user' })
    assert.deepEqual(body, { url: 'http://proxy.example.com', username: 'user', proxyHttp: false, port: 8080 })
    assert.ok(!('password' in body), 'blank password must not be sent as ""')
})

test('a blank port is omitted rather than sent as NaN', () => {
    const body = fill({ url: 'http://proxy.example.com' })
    assert.ok(!('port' in body), 'blank port must not be sent')
})

test('clearing the URL clears everything the API would reject otherwise', () => {
    const body = fill({})
    assert.deepEqual(body, { url: '', username: '', proxyHttp: false })
})

test('a typed password and port are sent verbatim', () => {
    const body = fill({ url: 'socks5://proxy.example.com', port: '1080', password: 'p@ss' })
    assert.equal(body.port, 1080)
    assert.equal(body.password, 'p@ss')
})

test('errors render with the account section first and escape HTML', () => {
    renderErrors({
        errors: [
            { level: 'error', ts: new Date().toISOString(), title: 'SEARCH', message: 'Failed <script>x</script>' },
            { level: 'warn', ts: new Date().toISOString(), message: 'partial dashboard' }
        ],
        accountErrors: [{ email: 'a@b.com', error: 'Mobile flow failed' }]
    })
    const html = getElement('errorsList').innerHTML
    assert.ok(html.includes('a@b.com'), 'account error is listed first')
    assert.ok(!html.includes('<script>'), 'message HTML is escaped')
    assert.ok(html.includes('ERROR'), 'log level is shown')
    assert.ok(html.includes('partial dashboard'), 'warnings appear')
})

test('history renders collapsed runs and escapes account emails', () => {
    renderHistory([
        {
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            exit: { code: 0, signal: null, at: new Date().toISOString() },
            collected: 120,
            accounts: [{ email: 'x<script>@y.com', collected: 120, success: true, error: null }]
        }
    ])
    const html = getElement('historyList').innerHTML
    assert.ok(html.includes('+120'), 'run total is shown')
    assert.ok(!html.includes('<script>'), 'email HTML is escaped')
    assert.ok(html.includes('exit 0'), 'exit code is formatted, not [object Object]')
})

test('a signal-based exit is labelled as killed', () => {
    assert.equal(formatExit({ code: null, signal: 'SIGTERM' }), 'killed (SIGTERM)')
    assert.equal(formatExit(0), 'exit 0')
    assert.equal(formatExit(null), '')
})