// Configuration
const API_BASE_URL = 'http://127.0.0.1:3010'
const POLL_INTERVAL = 5000 // 5 seconds
const MAX_LOG_LINES = 500

// State
let accounts = []
let selectedAccountIndexes = new Set()
let scheduledTasks = []
let logSource = null
let proxyAccountIndex = null

// DOM Elements
const emailInput = document.getElementById('emailInput')
const addAccountForm = document.getElementById('addAccountForm')
const accountsList = document.getElementById('accountsList')
const serverStatusEl = document.getElementById('serverStatus')
const totalAccountsEl = document.getElementById('totalAccounts')
const loggedInCountEl = document.getElementById('loggedInCount')
const notLoggedInCountEl = document.getElementById('notLoggedInCount')
const expiredCountEl = document.getElementById('expiredCount')
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

    fetch(`${API_BASE_URL}/accounts/${index}/proxy`)
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
        const response = await fetch(`${API_BASE_URL}/accounts/${index}/proxy`, {
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

    const source = new EventSource(`${API_BASE_URL}/events?replay=100`)
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
        const response = await fetch(`${API_BASE_URL}/health`)
        const data = await response.json()

        if (data.ok) {
            updateServerStatus(data.state === 'running' ? 'running' : 'online')
            await fetchAccounts()
        }
    } catch {
        updateServerStatus('offline')
    }
}

async function fetchAccounts() {
    try {
        const response = await fetch(`${API_BASE_URL}/accounts`)
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

        const response = await fetch(`${API_BASE_URL}/start`, {
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
        const response = await fetch(`${API_BASE_URL}/accounts`, {
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
        const response = await fetch(`${API_BASE_URL}/schedule/tasks`, {
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
        const response = await fetch(`${API_BASE_URL}/stop`, {
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

function handleDeleteAccount(index) {
    if (!confirm('Remove this account from the queue?')) return

    accounts = accounts.filter(acc => acc.index !== index)
    selectedAccountIndexes.delete(index)
    saveToLocalStorage()
    renderAccounts()
    updateStats()
    showToast('Account removed', 'success')
}

async function handleCancelScheduledTask(taskId) {
    if (!confirm('Cancel this scheduled task?')) return

    try {
        const response = await fetch(`${API_BASE_URL}/schedule/tasks/${taskId}`, {
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
                <input
                    type="checkbox"
                    class="account-checkbox"
                    ${isSelected ? 'checked' : ''}
                    data-index="${account.index}"
                    aria-label="Select ${account.email}"
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
                <button class="btn btn-secondary" data-index="${account.index}" data-action="proxy">Proxy</button>
                <button class="btn btn-danger" data-index="${account.index}" data-action="delete">Remove</button>
            </div>
        `
        })
        .join('')

    // Attach event listeners
    accountsList.querySelectorAll('.account-checkbox').forEach(checkbox => {
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
    serverStatusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1)

    // Stop only makes sense while something is actually running.
    stopBtn.disabled = status !== 'running'
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
