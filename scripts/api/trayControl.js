/**
 * Hide-to-tray for the control API's own console window.
 *
 * Windows has no way for a console process to hide its window from pure Node, so
 * the work is done by scripts/api/tray.ps1: it calls GetConsoleWindow/ShowWindow
 * and puts a System.Windows.Forms.NotifyIcon in the notification area. No native
 * module, no new dependency.
 *
 * The helper is spawned *without* windowsHide so it attaches to this console -
 * that inheritance is what makes its GetConsoleWindow() return our window. It is
 * also why hiding is only offered when we actually own a console (a TTY).
 *
 * The helper's stdout is the control channel (see the header of tray.ps1):
 * "Show terminal" restores the window and exits the helper; "Stop and exit"
 * sends `stopping`, which this class surfaces as a 'stopRequested' event so the
 * server can run its normal shutdown path. The icon only disappears once the
 * server process is really gone, so a hidden server can never be orphaned.
 */

import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'

const IS_WIN = process.platform === 'win32'
const TRAY_PREFIX = '__TRAY__ '

export class TrayController extends EventEmitter {
    constructor({ scriptPath, url, title, cwd, log = () => {} }) {
        super()
        this.scriptPath = scriptPath
        this.url = url
        this.title = title
        this.cwd = cwd
        this.log = log

        this.child = null
        this.hidden = false
        this._stdoutBuf = ''
        this._stderrBuf = ''
        this._pendingHide = null
    }

    /** Why hiding is unavailable right now, or null when it is available. */
    unsupportedReason() {
        if (!IS_WIN) return `Hiding to the tray is only available on Windows (this host runs ${process.platform}).`
        if (!process.stdout.isTTY) {
            return 'There is no console window to hide (the server was started without a terminal).'
        }
        if (!fs.existsSync(this.scriptPath)) return `Tray helper is missing: ${this.scriptPath}`
        return null
    }

    get supported() {
        return this.unsupportedReason() === null
    }

    getStatus() {
        const reason = this.unsupportedReason()
        return { supported: reason === null, hidden: this.hidden, ...(reason ? { reason } : {}) }
    }

    /**
     * Hides the console and shows the tray icon. Resolves once the helper
     * confirms the window is gone, so callers can report a real failure instead
     * of claiming success while the console is still on screen.
     */
    hide() {
        if (this.hidden) return Promise.resolve({ ok: true, alreadyHidden: true })
        if (this._pendingHide) return this._pendingHide

        const reason = this.unsupportedReason()
        if (reason) return Promise.resolve({ ok: false, error: reason })

        this._pendingHide = new Promise(resolve => {
            let settled = false
            const settle = result => {
                if (settled) return
                settled = true
                this._pendingHide = null
                resolve(result)
            }

            let child
            try {
                child = spawn(
                    'powershell.exe',
                    [
                        '-NoProfile',
                        '-NonInteractive',
                        '-ExecutionPolicy',
                        'Bypass',
                        '-File',
                        this.scriptPath,
                        '-Url',
                        this.url,
                        '-ServerPid',
                        String(process.pid),
                        '-Title',
                        this.title
                    ],
                    {
                        cwd: this.cwd,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        // Must attach to this console - see the file header.
                        windowsHide: false
                    }
                )
            } catch (error) {
                return settle({ ok: false, error: error instanceof Error ? error.message : String(error) })
            }

            this.child = child
            this._stdoutBuf = ''
            this._stderrBuf = ''

            child.stdout.setEncoding('utf8')
            child.stdout.on('data', chunk => {
                this._stdoutBuf += chunk
                let index
                while ((index = this._stdoutBuf.indexOf('\n')) !== -1) {
                    const line = this._stdoutBuf.slice(0, index).trim()
                    this._stdoutBuf = this._stdoutBuf.slice(index + 1)
                    if (line) this._onHelperLine(line, settle)
                }
            })

            child.stderr.setEncoding('utf8')
            child.stderr.on('data', chunk => {
                this._stderrBuf = (this._stderrBuf + chunk).slice(-4000)
            })

            child.on('error', error => {
                this.child = null
                this.hidden = false
                settle({ ok: false, error: error instanceof Error ? error.message : String(error) })
            })

            child.on('exit', () => {
                const wasHidden = this.hidden
                this.child = null
                this.hidden = false
                // Normal ends (shown / server shutting down) already settled the
                // promise; reaching settle() here means the helper died before
                // it ever reported "hidden".
                settle({
                    ok: false,
                    error: this._stderrBuf.trim() || 'The tray helper exited before it could hide the console.'
                })
                if (wasHidden) this.emit('shown')
            })
        })

        return this._pendingHide
    }

    _onHelperLine(line, settle) {
        if (!line.startsWith(TRAY_PREFIX)) {
            this.log('warn', `Tray helper: ${line}`)
            return
        }

        const [event, ...rest] = line.slice(TRAY_PREFIX.length).trim().split(/\s+/)
        const detail = rest.join(' ')

        switch (event) {
            case 'hidden':
                this.hidden = true
                this.emit('hidden')
                settle({ ok: true })
                break
            case 'shown':
                this.hidden = false
                this.emit('shown')
                break
            case 'stopping':
                // The icon stays up while the server unwinds; tray.ps1 watches
                // the pid and closes itself when the process exits.
                this.emit('stopRequested')
                break
            case 'server-gone':
                this.hidden = false
                break
            case 'error':
                this.hidden = false
                this.emit('shown')
                settle({ ok: false, error: detail || 'The tray helper reported an unknown error.' })
                break
            default:
                this.log('warn', `Tray helper sent an unknown event: ${event} ${detail}`.trim())
        }
    }

    /** Kills the helper (dropping the icon). The console stays in its current state. */
    dispose() {
        this.hidden = false
        if (!this.child) return
        const child = this.child
        this.child = null
        try {
            child.kill()
        } catch {}
    }
}
