// Configuration
const API_BASE_URL = 'http://127.0.0.1:3010'
const POLL_INTERVAL = 5000 // 5 seconds
const MAX_LOG_LINES = 500
const TOKEN_KEY = 'control_api_token'
const UNAUTHORIZED_MESSAGE = 'Unauthorized - the API requires a token. Paste it in the "API token" box in the header.'

// State
let accounts = []
let selectedAccountIndexes = new Set()
let scheduledTasks = []
let logSource = null
let proxyAccountIndex = null
let activeTab = 'logs'

// DOM Elements
const emailInput = document.getElementById('emailInput')
const addAccountForm = document.getElementById('addAccountForm')
const accountsList = document.getElementById('accountsList')
const serverStatusEl = document.getElementById('serverStatus')
const apiTokenInput = document.getElementById('apiTokenInput')
const totalAccountsEl = document.getElementById('totalAccounts')
const loggedInCountEl = document.getElementById('loggedInCount')
const notLoggedInCountEl = document.getElementById('notLoggedInCount')
const expiredCountEl = document.getElementById('expiredCount')
const pointsBalanceEl = document.getElementById('pointsBalance')
const pointsCollectedEl = document.getElementById('pointsCollected')
const pointsAccountsSeenEl = document.getElementById('pointsAccountsSeen')
const pointsAccountsEl = document.getElementById('pointsAccounts')
const pointsUpdatedEl = document.getElementById('pointsUpdated')
const selectAllBtn = document.getElementById('selectAllBtn')
const runSelectedBtn = document.getElementById('runSelectedBtn')
const scheduleSelectedBtn = document.getElementById('scheduleSelectedBtn')
const headlessToggle = document.getElementById('headlessToggle')
const visualSearchToggle = document.getElementById('visualSearchToggle')
const edgeBrowsingToggle = document.getElementById('edgeBrowsingToggle')
const stopBtn = document.getElementById('stopBtn')
const scheduleTimeInput = document.getElementById('scheduleTime')
const scheduledList = document.getElementById('scheduledList')
const logsConsole = document.getElementById('logsConsole')
const autoScrollToggle = document.getElementById('autoScrollToggle')
const clearLogsBtn = document.getElementById('clearLogsBtn')
const historyList = document.getElementById('historyList')
const errorsList = document.getElementById('errorsList')
const toast = document.getElementById('toast')
const proxyForm = document.getElementById('proxyForm')
const proxyEmpty = document.getElementById('proxyEmpty')
const proxyAccountEmail = document.getElementById('proxyAccountEmail')
const proxyUrlInput = document.getElementById('proxyUrlInput')
const proxyPortInput = document.getElementById('proxyPortInput')
const proxyUsernameInput = document.getElementById('proxyUsernameInput')
const proxyPasswordInput = document.getElementById('proxyPasswordInput')
const proxyPasswordHint = document.getElementById('proxyPasswordHint')
const proxyHttpToggle = document.getElementById('proxyHttpToggle')
const proxyCancelBtn = document.getElementById('proxyCancelBtn')
const proxyClearBtn = document.getElementById('proxyClearBtn')

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Restore the token before the first request so it is never sent bare.
    apiTokenInput.value = localStorage.getItem(TOKEN_KEY) || ''

    loadFromLocalStorage()
    loadScheduledTasks()
    setupEventListeners()
    checkServerHealth()
    startPolling()
    connectLogStream()

    // Load saved run preferences
    restoreToggle('headless_mode', headlessToggle)
    restoreToggle('visual_search', visualSearchToggle)
    restoreToggle('edge_browsing', edgeBrowsingToggle)
})

// The control API can run with API_TOKEN set, which every endpoint then
// requires. fetch() carries the header; EventSource cannot set headers at all,
// so the log stream passes the token as ?token= (the only endpoint that allows
// it) - see tokenFromReq in scripts/api/server.js.
function authHeaders(extra = {}) {
    const token = localStorage.getItem(TOKEN_KEY)
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

function apiUrl(path) {
    return `${API_BASE_URL}${path}`
}

async function apiFetch(path, options = {}) {
    const response = await fetch(apiUrl(path), {
        ...options,
        headers: authHeaders(options.headers)
    })
    if (response.status === 401) {
        updateServerStatus('unauthorized')
        showToast(UNAUTHORIZED_MESSAGE, 'error')
    }
    return response
}

function restoreToggle(key, element) {
    const saved = localStorage.getItem(key)
    if (saved !== null) element.checked = saved === 'true'
}

function setupEventListeners() {
    addAccountForm.addEventListener('submit', handleAddAccount)
    selectAllBtn.addEventListener('click', handleSelectAll)
    runSelectedBtn.addEventListener('click', handleRunSelected)
    scheduleSelectedBtn.addEventListener('click', handleScheduleSelected)
    headlessToggle.addEventListener('change', handleHeadlessToggle)
    visualSearchToggle.addEventListener('change', () =>
        localStorage.setItem('visual_search', visualSearchToggle.checked)
    )
    edgeBrowsingToggle.addEventListener('change', () =>
        localStorage.setItem('edge_browsing', edgeBrowsingToggle.checked)
    )
    stopBtn.addEventListener('click', handleStop)
    clearLogsBtn.addEventListener('click', handleClearLogs)
    proxyForm.addEventListener('submit', handleSaveProxy)
    proxyCancelBtn.addEventListener('click', closeProxyEditor)
    proxyClearBtn.addEventListener('click', handleClearProxy)
    apiTokenInput.addEventListener('change', handleTokenChange)

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => selectTab(btn.dataset.tab))
    })
}

function handleTokenChange() {
    const token = apiTokenInput.value.trim()
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
    // The log stream holds the token in its query string, so it has to reconnect.
    connectLogStream()
    checkServerHealth()
}

function selectTab(name) {
    activeTab = name
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const selected = btn.dataset.tab === name
        btn.classList.toggle('active', selected)
        btn.setAttribute('aria-selected', String(selected))
    })
    document.getElementById('panel-logs').hidden = name !== 'logs'
    document.getElementById('panel-history').hidden = name !== 'history'
    document.getElementById('panel-errors').hidden = name !== 'errors'
    refreshRunPanels()
}

// Proxy editor — edits ACCOUNT_N_PROXY_* in .env through the control API.
function openProxyEditor(index) {
    const account = accounts.find(acc => acc.index === index)
    if (!account) return

    proxyAccountIndex = index
    proxyAccountEmail.textContent = account.email
    proxyEmpty.hidden = true
    proxyForm.hidden = false

    // Reset first so a failed load cannot leave the previous account's values on screen.
    proxyUrlInput.value = ''
    proxyPortInput.value = ''
    proxyUsernameInput.value = ''
    proxyPasswordInput.value = ''
    proxyHttpToggle.checked = false

    apiFetch(`/accounts/${index}/proxy`)
        .then(response => (response.ok ? response.json() : Promise.reject(new Error('load failed'))))
        .then(data => {
            // Ignore a response that arrived after the user switched accounts.
            if (proxyAccountIndex !== index) return
            const proxy = data.proxy || {}
            proxyUrlInput.value = proxy.url || ''
            proxyPortInput.value = proxy.port ? String(proxy.port) : ''
            proxyUsernameInput.value = proxy.username || ''
            proxyHttpToggle.checked = Boolean(proxy.proxyHttp)
            proxyPasswordHint.textContent = proxy.hasPassword
                ? 'A password is saved. Leave blank to keep it.'
                : 'No password saved yet.'
        })
        .catch(() => showToast('Could not load the saved proxy', 'error'))

    proxyForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function closeProxyEditor() {
    proxyAccountIndex = null
    proxyForm.hidden = true
    proxyEmpty.hidden = false
    proxyAccountEmail.textContent = 'an account'
}

function proxyPayloadFromForm() {
    const body = {
        url: proxyUrlInput.value.trim(),
        username: proxyUsernameInput.value.trim(),
        proxyHttp: proxyHttpToggle.checked
    }
    // Omit blanks: the port field is only meaningful with a URL, and an empty
    // password means "keep the stored one".
    const port = proxyPortInput.value.trim()
    if (port) body.port = Number(port)
    if (proxyPasswordInput.value) body.password = proxyPasswordInput.value
    return body
}

async function saveProxy(body, successMessage) {
    const index = proxyAccountIndex
    if (index == null) return false

    try {
        const response = await apiFetch(`/accounts/${index}/proxy`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            showToast(data.error || 'Failed to save the proxy', 'error')
            return false
        }

        showToast(successMessage, 'success')
        closeProxyEditor()
        await checkServerHealth()
        return true
    } catch {
        showToast('Failed to connect to server', 'error')
        return false
    }
}

async function handleSaveProxy(e) {
    e.preventDefault()
    await saveProxy(proxyPayloadFromForm(), 'Proxy saved - it applies to the next run')
}

async function handleClearProxy() {
    if (!confirm('Remove the proxy for this account?')) return
    await saveProxy({ url: '', proxyHttp: false }, 'Proxy removed')
}

// Live log stream (Server-Sent Events)
function connectLogStream() {
    if (logSource) logSource.close()

    logsConsole.innerHTML = '<div class="log-empty">Connecting to log stream...</div>'

    const token = localStorage.getItem(TOKEN_KEY)
    const url = `${API_BASE_URL}/events?replay=100${token ? `&token=${encodeURIComponent(token)}` : ''}`
    const source = new EventSource(url)
    logSource = source

    source.addEventListener('hello', event => {
        const status = JSON.parse(event.data)
        updateServerStatus(status.state === 'running' ? 'running' : 'online')
        logsConsole.innerHTML = ''
    })

    source.addEventListener('log', event => {
        appendLogLine(JSON.parse(event.data))
    })

    source.addEventListener('status', event => {
        const status = JSON.parse(event.data)
        updateServerStatus(status.state === 'running' ? 'running' : 'online')
    })

    source.onerror = () => {
        updateServerStatus('offline')
        // EventSource reconnects on its own; surface the gap without spamming.
        if (!logsConsole.querySelector('.log-empty')) {
            appendLogLine({ level: 'warn', message: 'Log stream disconnected - reconnecting...' })
        }
    }

    window.addEventListener('beforeunload', () => source.close())
}

function appendLogLine(entry) {
    const empty = logsConsole.querySelector('.log-empty')
    if (empty) empty.remove()

    const line = document.createElement('div')
    line.className = 'log-line'
    line.dataset.level = entry.level || 'info'

    const time = document.createElement('span')
    time.className = 'log-time'
    time.textContent = formatLogTime(entry)

    const level = document.createElement('span')
    level.className = 'log-level'
    level.textContent = (entry.level || 'info').toUpperCase()

    const message = document.createElement('span')
    message.className = 'log-message'
    message.textContent = entry.title ? `[${entry.title}] ${entry.message ?? ''}` : (entry.message ?? '')

    line.append(time, level, message)
    logsConsole.append(line)

    while (logsConsole.childElementCount > MAX_LOG_LINES) {
        logsConsole.firstElementChild.remove()
    }

    const shouldScroll = autoScrollToggle.checked
    const nearBottom = logsConsole.scrollHeight - logsConsole.scrollTop - logsConsole.clientHeight < 80
    if (shouldScroll && nearBottom) {
        logsConsole.scrollTop = logsConsole.scrollHeight
    }
}

function formatLogTime(entry) {
    const raw = entry.ts || entry.receivedAt
    if (!raw) return '--:--:--'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return '--:--:--'
    return date.toLocaleTimeString(undefined, { hour12: false })
}

function handleClearLogs() {
    logsConsole.innerHTML = ''
}

// API Functions
async function checkServerHealth() {
    try {
        const response = await apiFetch(`/health`)
        const data = await response.json()

        if (data.ok) {
            updateServerStatus(data.state === 'running' ? 'running' : 'online')
            apiTokenInput.placeholder = data.authRequired ? 'required' : 'not required'
            await fetchAccounts()
            await fetchPoints()
            await refreshRunPanels()
        }
    } catch {
        updateServerStatus('offline')
    }
}

// Live point totals straight from the run parser - history only knows what a
// run already finished, so balances and leftovers live here.
async function fetchPoints() {
    try {
        const response = await apiFetch(`/points`)
        if (response.status === 401) return
        const data = await response.json()
        renderPoints(data)
    } catch {
        // Offline; the next poll picks it up.
    }
}

function renderPoints(data) {
    pointsBalanceEl.textContent = data.balance == null ? '—' : data.balance
    pointsCollectedEl.textContent = data.collected ?? 0
    pointsAccountsSeenEl.textContent = `${data.accountsSeen ?? 0}/${data.accountsTotal ?? 0}`
    pointsUpdatedEl.textContent = data.updatedAt
        ? `Updated ${formatLogTime({ ts: data.updatedAt })}${data.running ? ' · run active' : ''}`
        : data.running
          ? 'Run active, no points reported yet'
          : 'Waiting for a run…'

    const rows = (data.accounts || []).filter(acc => acc.balance != null || acc.collected)
    if (rows.length === 0) {
        pointsAccountsEl.innerHTML = '<p class="control-hint">Balances appear here once a run reports them.</p>'
        return
    }

    pointsAccountsEl.innerHTML = rows
        .map(acc => {
            const sources = Object.entries(acc.bySource || {})
                .map(([name, value]) => `${escapeHtml(name)} ${value}`)
                .join(' · ')
            const earnable = acc.earnable
                ? ` · earnable ${acc.earnable.mobile}/${acc.earnable.browser}/${acc.earnable.app}`
                : ''
            const edge = acc.edgeBrowsing?.status ? ` · Edge ${escapeHtml(acc.edgeBrowsing.status)}` : ''
            return `
            <div class="points-row">
                <div class="points-row-head">
                    <span class="points-email">${escapeHtml(acc.email)}</span>
                    <span class="points-balance">${acc.balance == null ? '—' : acc.balance} pts</span>
                </div>
                <div class="points-row-meta">
                    <span>+${acc.collected ?? 0} this run</span>${sources ? `<span>${sources}</span>` : ''}${earnable ? `<span>${earnable}</span>` : ''}${edge ? `<span>${edge}</span>` : ''}
                    ${acc.error ? `<span class="points-error">${escapeHtml(acc.error)}</span>` : ''}
                </div>
            </div>
        `
        })
        .join('')
}

// History and Errors are tab panels, so they only load when the tab is open.
async function refreshRunPanels() {
    if (activeTab === 'history') await fetchHistory()
    if (activeTab === 'errors') await fetchErrors()
}

async function fetchHistory() {
    try {
        const response = await apiFetch(`/history?limit=20`)
        if (response.status === 401) return
        const data = await response.json()
        renderHistory(data.runs || [])
    } catch {
        // leave the last render in place
    }
}

function renderHistory(runs) {
    if (runs.length === 0) {
        historyList.innerHTML = '<div class="empty-state"><p>No completed runs yet.</p></div>'
        return
    }

    historyList.innerHTML = runs
        .map((run, i) => {
            const started = run.startedAt ? new Date(run.startedAt).toLocaleString() : 'unknown start'
            const minutes =
                run.startedAt && run.endedAt
                    ? Math.round((Date.parse(run.endedAt) - Date.parse(run.startedAt)) / 60000)
                    : null
            const accounts = (run.accounts || [])
                .map(
                    acc => `
                <li class="history-account ${acc.success === false ? 'failed' : ''}">
                    <span class="history-email">${escapeHtml(acc.email)}</span>
                    <span>+${acc.collected ?? 0}</span>
                    ${acc.error ? `<span class="history-error">${escapeHtml(acc.error)}</span>` : ''}
                </li>
            `
                )
                .join('')
            // run.exit is { code, signal, at } from the API, not a number.
            const exit = formatExit(run.exit)
            return `
            <details class="history-run" ${i === 0 ? 'open' : ''}>
                <summary>
                    <span>${escapeHtml(started)}</span>
                    <span class="history-totals">+${run.collected ?? 0} pts${minutes != null ? ` · ${minutes}m` : ''}${exit ? ` · ${exit}` : ''}</span>
                </summary>
                <ul class="history-accounts">${accounts || '<li class="history-account">No accounts recorded.</li>'}</ul>
            </details>
        `
        })
        .join('')
}

function formatExit(exit) {
    if (exit == null) return ''
    if (typeof exit !== 'object') return `exit ${exit}`
    if (exit.signal) return `killed (${exit.signal})`
    return `exit ${exit.code ?? '?'}`
}

async function fetchErrors() {
    try {
        const response = await apiFetch(`/errors?limit=100`)
        if (response.status === 401) return
        const data = await response.json()
        renderErrors(data)
    } catch {
        // leave the last render in place
    }
}

function renderErrors(data) {
    const entries = data.errors || []
    const accountErrors = data.accountErrors || []

    if (entries.length === 0 && accountErrors.length === 0) {
        errorsList.innerHTML = '<div class="empty-state"><p>No errors or warnings yet.</p></div>'
        return
    }

    const accountHtml = accountErrors
        .map(
            item => `
        <div class="error-entry" data-level="error">
            <span class="log-time">account</span>
            <span class="log-level">ERROR</span>
            <span class="log-message">${escapeHtml(item.email)}: ${escapeHtml(item.error)}</span>
        </div>
    `
        )
        .join('')

    const logHtml = entries
        .map(
            entry => `
        <div class="error-entry" data-level="${escapeHtml(entry.level || 'error')}">
            <span class="log-time">${formatLogTime(entry)}</span>
            <span class="log-level">${escapeHtml((entry.level || 'error').toUpperCase())}</span>
            <span class="log-message">${entry.title ? `[${escapeHtml(entry.title)}] ` : ''}${escapeHtml(entry.message ?? '')}</span>
        </div>
    `
        )
        .join('')

    errorsList.innerHTML = accountHtml + logHtml
}

async function fetchAccounts() {
    try {
        const response = await apiFetch(`/accounts`)
        const data = await response.json()

        if (data.accounts) {
            const apiAccounts = new Map()
            const apiAccountEmails = new Set()

            // Map API accounts by email - session-derived status wins so the
            // badge reflects live cookies, not empty post-restart run history.
            for (const acc of data.accounts) {
                apiAccountEmails.add(acc.email)
                apiAccounts.set(acc.email, {
                    index: acc.index,
                    email: acc.email,
                    points: acc.lastCollected || 0,
                    status: acc.sessionStatus ? acc.sessionStatus : determineAccountStatus(acc),
                    sessionStatus: acc.sessionStatus ?? null,
                    sessionUpdatedAt: acc.sessionUpdatedAt ?? null,
                    runs: acc.runs || 0,
                    lastRunAt: acc.lastRunAt,
                    lastSuccess: acc.lastSuccess,
                    isConfigured: true // Mark as configured in API
                })
            }

            // Merge: update existing localStorage accounts with API data
            accounts = accounts.map(localAcc => {
                const apiData = apiAccounts.get(localAcc.email)
                if (apiData) {
                    // Account exists in API, merge live data
                    return { ...localAcc, ...apiData }
                }
                // Account only in localStorage (not yet in .env)
                return { ...localAcc, isConfigured: false }
            })

            // Adopt accounts that exist in .env but were never seen by this browser
            const knownEmails = new Set(accounts.map(acc => acc.email))
            for (const [email, apiData] of apiAccounts) {
                if (!knownEmails.has(email)) accounts.push(apiData)
            }

            saveToLocalStorage()
            renderAccounts()
            updateStats()
        }
    } catch (error) {
        console.error('Failed to fetch accounts:', error)
    }
}

function determineAccountStatus(account) {
    if (!account.lastRunAt) return 'not-logged-in'
    if (account.lastSuccess === true) return 'logged-in'
    if (account.lastSuccess === false) return 'expired'
    return 'not-logged-in'
}

async function startMultipleAccounts(accountIndexes, options = {}) {
    try {
        const { headless = false, visualSearch = false, edgeBrowsing = false } = options

        // Only work with accounts that are configured in the API
        const apiAccounts = accounts.filter(acc => acc.isConfigured)

        if (apiAccounts.length === 0) {
            showToast('No accounts configured in .env yet. Add credentials and rebuild.', 'warning')
            return
        }

        // Filter selected indexes to only include API-backed accounts
        const validIndexes = accountIndexes.filter(idx => apiAccounts.some(acc => acc.index === idx))

        if (validIndexes.length === 0) {
            showToast('Selected accounts are not configured in .env yet', 'warning')
            return
        }

        const allApiIndexes = apiAccounts.map(acc => acc.index)
        const excludedIndexes = allApiIndexes.filter(idx => !validIndexes.includes(idx))

        // These map onto config.json paths; both features are off in config by
        // default, so without the overrides they never run.
        const body = {
            env: {
                CONFIG_HEADLESS: headless ? 'true' : 'false',
                CONFIG_WORKER_VISUAL_SEARCH: visualSearch ? 'true' : 'false',
                CONFIG_EXPERIMENTAL_EDGE_BROWSING: edgeBrowsing ? 'true' : 'false'
            }
        }

        if (excludedIndexes.length > 0) {
            body.excludedAccountIndexes = excludedIndexes
        }

        const response = await apiFetch(`/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        const data = await response.json()

        if (response.ok) {
            showToast(`Started ${validIndexes.length} account(s)${headless ? ' in headless mode' : ''}`, 'success')
            await checkServerHealth()
            return true
        } else {
            showToast(data.error || 'Failed to start accounts', 'error')
            return false
        }
    } catch {
        showToast('Failed to connect to server', 'error')
        return false
    }
}

// Event Handlers
async function handleAddAccount(e) {
    e.preventDefault()

    const email = emailInput.value.trim()

    if (!email) {
        showToast('Please enter an email address', 'error')
        return
    }

    if (accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase())) {
        showToast('Account already exists', 'warning')
        return
    }

    const submitBtn = addAccountForm.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    submitBtn.textContent = 'Adding...'

    try {
        const response = await apiFetch(`/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        const data = await response.json()

        if (response.ok) {
            accounts.push({
                index: data.index,
                email: data.email,
                points: 0,
                status: 'not-logged-in',
                runs: 0,
                lastRunAt: null,
                lastSuccess: null,
                isConfigured: true
            })
            saveToLocalStorage()
            renderAccounts()
            updateStats()
            emailInput.value = ''
            showToast(`${data.email} added and ready to run`, 'success')
        } else {
            showToast(data.error || 'Failed to add account', 'error')
        }
    } catch {
        showToast('Failed to connect to server', 'error')
    }

    submitBtn.disabled = false
    submitBtn.textContent = 'Add Account'
}

function handleSelectAll() {
    if (selectedAccountIndexes.size === accounts.length) {
        selectedAccountIndexes.clear()
        selectAllBtn.textContent = 'Select All'
    } else {
        accounts.forEach(acc => selectedAccountIndexes.add(acc.index))
        selectAllBtn.textContent = 'Deselect All'
    }
    renderAccounts()
}

async function handleRunSelected() {
    if (selectedAccountIndexes.size === 0) {
        showToast('Please select at least one account', 'warning')
        return
    }

    runSelectedBtn.disabled = true
    runSelectedBtn.textContent = 'Starting...'

    const indexArray = Array.from(selectedAccountIndexes)
    const success = await startMultipleAccounts(indexArray, {
        headless: headlessToggle.checked,
        visualSearch: visualSearchToggle.checked,
        edgeBrowsing: edgeBrowsingToggle.checked
    })

    runSelectedBtn.disabled = false
    runSelectedBtn.textContent = 'Run Selected'

    if (success) {
        selectedAccountIndexes.clear()
        selectAllBtn.textContent = 'Select All'
        renderAccounts()
    }
}

async function handleScheduleSelected() {
    if (selectedAccountIndexes.size === 0) {
        showToast('Please select at least one account', 'warning')
        return
    }

    const scheduleTime = scheduleTimeInput.value
    if (!scheduleTime) {
        showToast('Please select a date and time', 'warning')
        return
    }

    const scheduledDate = new Date(scheduleTime)
    const now = new Date()

    if (scheduledDate <= now) {
        showToast('Schedule time must be in the future', 'warning')
        return
    }

    scheduleSelectedBtn.disabled = true
    scheduleSelectedBtn.textContent = 'Scheduling...'

    const indexArray = Array.from(selectedAccountIndexes)
    const headless = headlessToggle.checked
    const visualSearch = visualSearchToggle.checked
    const edgeBrowsing = edgeBrowsingToggle.checked
    const accountEmails = accounts.filter(acc => indexArray.includes(acc.index)).map(acc => acc.email)

    try {
        const response = await apiFetch(`/schedule/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountIndexes: indexArray,
                scheduledAt: scheduledDate.toISOString(),
                headless,
                visualSearch,
                edgeBrowsing
            })
        })

        const data = await response.json()

        if (response.ok) {
            const task = {
                id: data.task.id,
                accountIndexes: indexArray,
                accountEmails,
                scheduledAt: scheduledDate.toISOString(),
                headless,
                visualSearch,
                edgeBrowsing,
                createdAt: new Date().toISOString()
            }

            scheduledTasks.push(task)
            saveScheduledTasks()
            renderScheduledTasks()

            const timeStr = scheduledDate.toLocaleString()
            showToast(`Accounts scheduled to run at ${timeStr}`, 'success')

            selectedAccountIndexes.clear()
            selectAllBtn.textContent = 'Select All'
            scheduleTimeInput.value = ''
            renderAccounts()
        } else {
            showToast(data.error || 'Failed to schedule task', 'error')
        }
    } catch {
        showToast('Failed to connect to server', 'error')
    }

    scheduleSelectedBtn.disabled = false
    scheduleSelectedBtn.textContent = 'Schedule Run'
}

function handleHeadlessToggle() {
    localStorage.setItem('headless_mode', headlessToggle.checked)
}

async function handleStop() {
    stopBtn.disabled = true
    stopBtn.textContent = 'Stopping...'

    try {
        const response = await apiFetch(`/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: false })
        })

        if (response.ok) {
            showToast('Stopping run - closing browsers...', 'warning')
        } else {
            const data = await response.json().catch(() => ({}))
            showToast(data.error || 'Failed to stop the run', 'error')
        }
    } catch {
        showToast('Failed to connect to server', 'error')
    }

    stopBtn.textContent = 'Stop'
    // updateServerStatus re-enables it while a run is still active.
    await checkServerHealth()
}

function handleAccountCheckbox(index, checked) {
    if (checked) {
        selectedAccountIndexes.add(index)
    } else {
        selectedAccountIndexes.delete(index)
    }

    selectAllBtn.textContent = selectedAccountIndexes.size === accounts.length ? 'Deselect All' : 'Select All'
    renderAccounts()
}

async function handleDeleteAccount(index) {
    const account = accounts.find(acc => acc.index === index)
    if (!account) return

    const label = account.email
    if (!account.isConfigured) {
        showToast(`${label} is not in .env yet, so there is nothing to remove.`, 'warning')
        return
    }
    if (!confirm(`Remove ${label} from .env?\n\nThis also deletes its saved sign-in sessions.`)) return

    try {
        const response = await apiFetch(`/accounts/${index}`, { method: 'DELETE' })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            showToast(data.error || 'Failed to remove the account', 'error')
            return
        }

        // Drop it locally now so the row goes before the next poll lands.
        accounts = accounts.filter(acc => acc.index !== index)
        selectedAccountIndexes.delete(index)
        saveToLocalStorage()
        renderAccounts()
        updateStats()
        const sessions = data.sessionsRemoved ? ` (${data.sessionsRemoved} session rows deleted)` : ''
        showToast(`${label} removed${sessions}`, 'success')
        await fetchAccounts()
    } catch {
        showToast('Failed to connect to server', 'error')
    }
}

async function handleCancelScheduledTask(taskId) {
    if (!confirm('Cancel this scheduled task?')) return

    try {
        const response = await apiFetch(`/schedule/tasks/${taskId}`, {
            method: 'DELETE'
        })

        if (response.ok) {
            scheduledTasks = scheduledTasks.filter(task => task.id !== taskId)
            saveScheduledTasks()
            renderScheduledTasks()
            showToast('Scheduled task cancelled', 'success')
        } else {
            showToast('Failed to cancel task', 'error')
        }
    } catch {
        // If API doesn't support cancellation, remove locally
        scheduledTasks = scheduledTasks.filter(task => task.id !== taskId)
        saveScheduledTasks()
        renderScheduledTasks()
        showToast('Scheduled task cancelled', 'success')
    }
}

// Rendering Functions
function renderAccounts() {
    if (accounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <p>No accounts configured. Add an account above to get started.</p>
            </div>
        `
        return
    }

    accountsList.innerHTML = accounts
        .map(account => {
            const isSelected = selectedAccountIndexes.has(account.index)
            return `
            <div class="account-card ${isSelected ? 'selected' : ''}" role="listitem">
                <div class="account-toggle" data-toggle="${account.index}" role="checkbox" tabindex="0"
                     aria-checked="${isSelected}" aria-label="Select ${escapeHtml(account.email)}">
                    <input
                        type="checkbox"
                        class="account-checkbox"
                        ${isSelected ? 'checked' : ''}
                        data-index="${account.index}"
                        aria-label="Select ${escapeHtml(account.email)}"
                    >
                    <div class="account-info">
                        <div class="account-email">${escapeHtml(account.email)}</div>
                        <div class="account-meta">
                            <span>Runs: ${account.runs}</span>
                            ${account.lastRunAt ? `<span>Last: ${formatDate(account.lastRunAt)}</span>` : ''}
                            ${account.proxy ? `<span class="account-proxy-badge">${escapeHtml(formatProxyLabel(account.proxy))}</span>` : ''}
                        </div>
                    </div>
                    <div class="account-points">${account.points} pts</div>
                    <span class="account-status ${account.status}">${formatStatus(account.status)}</span>
                </div>
                <button class="btn btn-secondary" data-index="${account.index}" data-action="proxy">Proxy</button>
                ${account.status === 'expired' ? `<button class="btn btn-secondary" data-index="${account.index}" data-action="relogin">Re-login</button>` : ''}
                <button class="btn btn-danger" data-index="${account.index}" data-action="delete">Remove</button>
            </div>
        `
        })
        .join('')

    // Attach event listeners
    accountsList.querySelectorAll('.account-toggle').forEach(row => {
        const checkbox = row.querySelector('.account-checkbox')
        const index = parseInt(row.dataset.toggle)

        // Clicking anywhere in the row toggles it. The checkbox is a real one
        // underneath for keyboard and screen readers; the label-less wrapper
        // decides the new state from the checkbox itself, not from the click.
        row.addEventListener('click', e => {
            // The Proxy and Remove buttons live outside this wrapper, but guard
            // anyway so a future nesting mistake cannot swallow their clicks.
            if (e.target.closest('button')) return
            handleAccountCheckbox(index, !checkbox.checked)
        })

        row.addEventListener('keydown', e => {
            if (e.key !== ' ' && e.key !== 'Enter') return
            if (e.target !== row) return
            e.preventDefault()
            handleAccountCheckbox(index, !checkbox.checked)
        })

        // The checkbox is inside the row, so its own change event would fire
        // after the row click already toggled. Stop it double-counting.
        checkbox.addEventListener('click', e => e.stopPropagation())
        checkbox.addEventListener('change', e => {
            handleAccountCheckbox(parseInt(e.target.dataset.index), e.target.checked)
        })
    })

    accountsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', e => {
            handleDeleteAccount(parseInt(e.target.dataset.index))
        })
    })

    accountsList.querySelectorAll('[data-action="proxy"]').forEach(btn => {
        btn.addEventListener('click', e => {
            openProxyEditor(parseInt(e.target.dataset.index))
        })
    })

    accountsList.querySelectorAll('[data-action="relogin"]').forEach(btn => {
        btn.addEventListener('click', e => {
            handleRelogin(parseInt(e.target.dataset.index))
        })
    })
}

// A stale sign-in is the one failure the UI can actually fix: drop the stored
// session, then run the account again so the bot signs in from scratch.
async function handleRelogin(index) {
    const account = accounts.find(acc => acc.index === index)
    if (!account) return
    if (!confirm(`Sign ${account.email} in again?\n\nThis deletes its stored session cookie and starts a fresh run.`))
        return

    try {
        const response = await apiFetch(`/sessions/${encodeURIComponent(account.email)}`, { method: 'DELETE' })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            showToast(data.error || 'Could not clear the stored session', 'error')
            return
        }

        const sessions = data.deleted ? ` (${data.removed} session rows deleted)` : ''
        showToast(`${account.email}: stored session cleared${sessions}, signing in again...`, 'success')

        runSelectedBtn.disabled = true
        runSelectedBtn.textContent = 'Signing in...'
        await startMultipleAccounts([index], {
            headless: headlessToggle.checked,
            visualSearch: visualSearchToggle.checked,
            edgeBrowsing: edgeBrowsingToggle.checked
        })
        runSelectedBtn.disabled = false
        runSelectedBtn.textContent = 'Run Selected'
    } catch {
        showToast('Failed to connect to server', 'error')
    }
}

function formatProxyLabel(proxy) {
    const label = `${proxy.url}${proxy.port ? `:${proxy.port}` : ''}`
    return proxy.hasCredentials ? `${label} (auth)` : label
}

function updateStats() {
    const loggedIn = accounts.filter(acc => acc.status === 'logged-in').length
    const notLoggedIn = accounts.filter(acc => acc.status === 'not-logged-in').length
    const expired = accounts.filter(acc => acc.status === 'expired').length

    totalAccountsEl.textContent = accounts.length
    loggedInCountEl.textContent = loggedIn
    notLoggedInCountEl.textContent = notLoggedIn
    expiredCountEl.textContent = expired
}

function renderScheduledTasks() {
    // Remove expired tasks
    const now = new Date()
    scheduledTasks = scheduledTasks.filter(task => new Date(task.scheduledAt) > now)
    saveScheduledTasks()

    if (scheduledTasks.length === 0) {
        scheduledList.innerHTML = `
            <div class="empty-state">
                <p>No scheduled tasks</p>
            </div>
        `
        return
    }

    scheduledList.innerHTML = scheduledTasks
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
        .map(task => {
            const scheduledDate = new Date(task.scheduledAt)
            return `
            <div class="scheduled-task">
                <div class="scheduled-info">
                    <div class="scheduled-time">${scheduledDate.toLocaleString()}</div>
                    <div class="scheduled-accounts">
                        ${task.accountEmails.length} account(s): ${task.accountEmails.join(', ')}
                    </div>
                    ${task.headless ? '<span class="scheduled-mode">Headless Mode</span>' : ''}
                </div>
                <button class="btn btn-danger" data-task-id="${task.id}" data-action="cancel-task">Cancel</button>
            </div>
        `
        })
        .join('')

    // Attach event listeners
    scheduledList.querySelectorAll('[data-action="cancel-task"]').forEach(btn => {
        btn.addEventListener('click', e => {
            handleCancelScheduledTask(e.target.dataset.taskId)
        })
    })
}

function updateServerStatus(status) {
    serverStatusEl.dataset.status = status
    serverStatusEl.textContent =
        status === 'unauthorized' ? 'Token needed' : status.charAt(0).toUpperCase() + status.slice(1)

    // Stop only makes sense while something is actually running.
    stopBtn.disabled = status !== 'running'
    // A rejected token is fixable, so leave Run enabled rather than stranding the user.
    runSelectedBtn.disabled = status === 'running'
}

function showToast(message, type = 'success') {
    toast.textContent = message
    toast.className = `toast ${type} show`

    setTimeout(() => {
        toast.classList.remove('show')
    }, 3000)
}

// Utility Functions
function formatStatus(status) {
    return status
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('rewards_accounts', JSON.stringify(accounts))
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('rewards_accounts')
    if (stored) {
        try {
            accounts = JSON.parse(stored)
        } catch {
            accounts = []
        }
    }
}

function saveScheduledTasks() {
    localStorage.setItem('scheduled_tasks', JSON.stringify(scheduledTasks))
}

function loadScheduledTasks() {
    const stored = localStorage.getItem('scheduled_tasks')
    if (stored) {
        try {
            scheduledTasks = JSON.parse(stored)
            renderScheduledTasks()
        } catch {
            scheduledTasks = []
        }
    }
}

// Polling
function startPolling() {
    setInterval(() => {
        checkServerHealth()
    }, POLL_INTERVAL)
}

// Node-only export hook so tests/publicUi.test.mjs can exercise the rendering
// and proxy rules without a browser. Inert in the page (no `module` there).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { proxyPayload: proxyPayloadFromForm, renderErrors, renderHistory, formatExit }
}
