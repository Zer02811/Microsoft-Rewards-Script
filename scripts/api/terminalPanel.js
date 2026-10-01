/**
 * Interactive terminal panel, shown only when the server is started by hand in
 * a real terminal (stdin is a TTY). Scheduled/hidden launches never see it.
 *
 * One keypress per action - no Enter needed:
 *   [h] hide this terminal to the tray (Windows; the run keeps going)
 *   [w] toggle "start with Windows"
 *   [o] open the Web UI in the default browser
 *   [q] quit the server (Ctrl+C works as always)
 *
 * Raw mode has one consequence to keep in mind: Ctrl+C no longer generates
 * SIGINT by itself, so the key handler recreates it by calling onQuit().
 */

import readline from 'node:readline'

const ESC = '\u001b['
const styles = {
    dim: text => `${ESC}2m${text}${ESC}0m`,
    bold: text => `${ESC}1m${text}${ESC}0m`,
    key: text => `${ESC}1m${ESC}36m[${text}]${ESC}0m`,
    on: text => `${ESC}1m${ESC}32m${text}${ESC}0m`,
    off: text => `${ESC}2m${text}${ESC}0m`
}

export class TerminalPanel {
    /**
     * @param {object} deps everything the panel can do, injected so it stays testable
     *   url            - Web UI address for display and [o]
     *   tray           - TrayController (or null off-Windows)
     *   getAutostart   - () => autostart status object
     *   toggleAutostart- () => new status object (throws on failure)
     *   openBrowser    - (url) => void
     *   onQuit         - () => void, must shut the server down
     *   write          - output sink, default process.stdout
     */
    constructor({ url, tray, getAutostart, toggleAutostart, openBrowser, onQuit, write }) {
        this.url = url
        this.tray = tray
        this.getAutostart = getAutostart
        this.toggleAutostart = toggleAutostart
        this.openBrowser = openBrowser
        this.onQuit = onQuit
        this.write = write ?? (text => process.stdout.write(text))

        this.active = false
        this._busy = false
        this._onKeypress = this._handleKey.bind(this)
    }

    static isInteractive() {
        return Boolean(process.stdin.isTTY && process.stdout.isTTY)
    }

    start() {
        if (this.active || !TerminalPanel.isInteractive()) return false
        this.active = true

        readline.emitKeypressEvents(process.stdin)
        process.stdin.setRawMode(true)
        process.stdin.on('keypress', this._onKeypress)
        process.stdin.resume()

        this.render()
        return true
    }

    stop() {
        if (!this.active) return
        this.active = false
        process.stdin.off('keypress', this._onKeypress)
        if (process.stdin.isTTY) process.stdin.setRawMode(false)
        process.stdin.pause()
    }

    render() {
        const autostart = this._autostartLabel()
        const lines = [
            '',
            styles.bold('  Control panel') + styles.dim(`  -  Web UI at ${this.url}`),
            `  ${styles.key('h')} hide terminal to tray${this.tray?.supported ? '' : styles.dim(' (unavailable)')}`,
            `  ${styles.key('w')} start with Windows: ${autostart}`,
            `  ${styles.key('o')} open Web UI`,
            `  ${styles.key('q')} quit`,
            ''
        ]
        this.write(lines.join('\n') + '\n')
    }

    _autostartLabel() {
        try {
            const status = this.getAutostart()
            if (!status.supported) return styles.dim(`unavailable - ${status.reason ?? 'not supported here'}`)
            if (!status.enabled) return styles.off('OFF')
            if (status.stale) return styles.on('ON') + styles.dim(' (points at another install - press w twice to fix)')
            if (!status.managed) return styles.on('ON') + styles.dim(' (entry not managed by this app)')
            return styles.on('ON')
        } catch (error) {
            return styles.dim(`unknown (${error.message})`)
        }
    }

    _note(message) {
        this.write(`  ${message}\n`)
    }

    async _handleKey(str, key) {
        if (!key) return

        // Raw mode swallows the terminal's own Ctrl+C handling.
        if (key.ctrl && key.name === 'c') {
            this._quit()
            return
        }
        if (key.ctrl || key.meta) return
        if (this._busy) return

        switch (key.name) {
            case 'h': {
                if (!this.tray) {
                    this._note('Hiding to the tray is only available on Windows.')
                    return
                }
                const reason = this.tray.unsupportedReason()
                if (reason) {
                    this._note(reason)
                    return
                }
                this._busy = true
                this._note('Hiding terminal - look for the icon in the system tray...')
                try {
                    const result = await this.tray.hide()
                    if (!result.ok) this._note(`Could not hide: ${result.error}`)
                } finally {
                    this._busy = false
                }
                break
            }
            case 'w': {
                this._busy = true
                try {
                    const status = this.toggleAutostart()
                    this._note(
                        status.enabled
                            ? `Start with Windows is ON - launcher written to ${status.path}`
                            : 'Start with Windows is OFF.'
                    )
                } catch (error) {
                    this._note(`Could not change autostart: ${error.message}`)
                } finally {
                    this._busy = false
                }
                this.render()
                break
            }
            case 'o':
                try {
                    this.openBrowser(this.url)
                    this._note(`Opening ${this.url}`)
                } catch (error) {
                    this._note(`Could not open the browser: ${error.message}`)
                }
                break
            case 'q':
                this._quit()
                break
            default:
                break
        }
    }

    /** Hands the terminal back (raw mode off) before the server shuts down. */
    _quit() {
        this.stop()
        this.onQuit()
    }
}
