import type { Page } from 'patchright'

import type { MicrosoftRewardsBot } from '../../../index'

const LOG_TAG = 'EDGE-BROWSING'
const SESSION_MINUTES = 30
const READ_BUDGET_MIN_MS = 45_000
const READ_BUDGET_MAX_MS = 120_000

// Hosts a browsing session may follow; anything else is treated as unsafe and skipped.
const SAFE_HOST_SUFFIXES = ['bing.com', 'microsoft.com', 'msn.com', 'microsoftedge.com']

const DEFAULT_FEED = 'https://www.msn.com/en-us/news'

const FEED_URLS = [
    DEFAULT_FEED,
    'https://www.msn.com/en-us/money',
    'https://www.msn.com/en-us/lifestyle',
    'https://www.msn.com/en-us/entertainment',
    'https://www.bing.com/news/search?q=technology',
    'https://www.bing.com/news/search?q=science',
    'https://www.bing.com/news/search?q=sports',
    'https://www.bing.com/news/search?q=health'
]

/**
 * Keeps a real browser tab open for TARGET 30 minutes, scrolling and clicking like a reader.
 * Runs in a tab of an already-authenticated context so fingerprints and cookies stay consistent.
 */
export class EdgeLiveBrowsing {
    constructor(private readonly bot: MicrosoftRewardsBot) {}

    public async run(signal?: AbortSignal): Promise<void> {
        const startedAt = Date.now()
        const deadline = startedAt + SESSION_MINUTES * 60_000

        const page = await this.openPage(signal)
        if (!page) {
            this.bot.logger.info(
                this.bot.isMobile,
                LOG_TAG,
                'Live browsing skipped: no open browser context in this run'
            )
            return
        }

        let pagesRead = 0
        let linksClicked = 0

        this.bot.logger.info(
            this.bot.isMobile,
            LOG_TAG,
            `Started live Edge browsing session | minutes=${SESSION_MINUTES} | startUrl=${page.url()}`
        )

        try {
            while (Date.now() < deadline && !signal?.aborted) {
                await this.readPage(page, deadline, signal)
                if (signal?.aborted || Date.now() >= deadline) break
                pagesRead++

                // Readers mostly finish a page and move on; sometimes they follow a link.
                if (Math.random() < 0.35 && (await this.clickSafeLink(page))) {
                    linksClicked++
                } else {
                    await this.gotoFeed(page)
                }

                await this.wait(this.bot.utils.randomDelay(2000, 6000), signal)
            }
        } catch (error) {
            if (!signal?.aborted) {
                this.bot.logger.warn(
                    this.bot.isMobile,
                    LOG_TAG,
                    `Live browsing interrupted | message=${error instanceof Error ? error.message : String(error)}`
                )
            }
        } finally {
            const minutes = Math.round((Date.now() - startedAt) / 60_000)
            this.bot.logger.info(
                this.bot.isMobile,
                LOG_TAG,
                `Finished live Edge browsing session | minutes=${minutes} | pagesRead=${pagesRead} | linkClicks=${linksClicked}`,
                'green'
            )
            await page.close().catch(() => undefined)
        }
    }

    private async openPage(signal?: AbortSignal): Promise<Page | null> {
        // The mobile context lives for the whole run; the desktop one may close early.
        const candidates = [this.bot.mainMobilePage, this.bot.mainDesktopPage]

        for (const source of candidates) {
            if (signal?.aborted) return null
            try {
                if (!source || source.isClosed()) continue
                const context = source.context()
                if (context.isClosed()) continue

                const page = await context.newPage()
                await page.goto(this.pickFeed(), { waitUntil: 'domcontentloaded', timeout: 30_000 })
                return page
            } catch {
                continue
            }
        }

        return null
    }

    private async readPage(page: Page, deadline: number, signal?: AbortSignal): Promise<void> {
        const budget = Math.min(
            this.bot.utils.randomDelay(READ_BUDGET_MIN_MS, READ_BUDGET_MAX_MS),
            Math.max(5_000, deadline - Date.now())
        )
        const until = Date.now() + budget

        while (Date.now() < until && !signal?.aborted) {
            let atBottom: boolean
            try {
                atBottom = await page.evaluate(() => {
                    const doc = document.documentElement
                    return window.scrollY + window.innerHeight >= doc.scrollHeight - 40
                })
            } catch {
                return
            }
            if (atBottom) break

            await page.mouse.wheel(0, this.bot.utils.randomDelay(250, 700)).catch(() => undefined)

            // Mostly short reading pauses, occasionally a long one like a human re-reading a paragraph.
            const longPause = Math.random() < 0.12
            const delay = longPause ? this.bot.utils.randomDelay(3000, 6000) : this.bot.utils.randomDelay(700, 2200)
            if (!(await this.wait(delay, signal))) return
        }

        // Dwell at the end of the article before moving on.
        await this.wait(this.bot.utils.randomDelay(2000, 6000), signal)
    }

    private async clickSafeLink(page: Page): Promise<boolean> {
        let hrefs: string[]
        try {
            hrefs = await page.$$eval('a[href]', anchors =>
                (anchors as HTMLAnchorElement[]).map(a => a.href).filter(h => /^https?:\/\//i.test(h))
            )
        } catch {
            return false
        }

        let currentHost = ''
        try {
            currentHost = new URL(page.url()).hostname
        } catch {
            return false
        }

        const safe = hrefs.filter(href => {
            try {
                const host = new URL(href).hostname
                return (
                    host === currentHost ||
                    SAFE_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`))
                )
            } catch {
                return false
            }
        })
        if (!safe.length) return false

        const target = safe[Math.floor(Math.random() * safe.length)]
        if (!target) return false

        try {
            await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20_000 })
            this.bot.logger.debug(
                this.bot.isMobile,
                LOG_TAG,
                `Live browsing followed a link | host=${new URL(target).hostname}`
            )
            return true
        } catch {
            return false
        }
    }

    private async gotoFeed(page: Page): Promise<void> {
        try {
            await page.goto(this.pickFeed(), { waitUntil: 'domcontentloaded', timeout: 25_000 })
        } catch {
            this.bot.logger.debug(
                this.bot.isMobile,
                LOG_TAG,
                'Live browsing page load timed out; continuing on the current page'
            )
        }
    }

    private pickFeed(): string {
        return FEED_URLS[Math.floor(Math.random() * FEED_URLS.length)] ?? DEFAULT_FEED
    }

    private wait(delayMs: number, signal?: AbortSignal): Promise<boolean> {
        if (signal?.aborted) return Promise.resolve(false)
        if (!signal) return this.bot.utils.wait(delayMs).then(() => true)

        return new Promise(resolve => {
            const onAbort = () => {
                clearTimeout(timeout)
                resolve(false)
            }
            const timeout = setTimeout(() => {
                signal.removeEventListener('abort', onAbort)
                resolve(true)
            }, delayMs)

            signal.addEventListener('abort', onAbort, { once: true })
        })
    }
}
