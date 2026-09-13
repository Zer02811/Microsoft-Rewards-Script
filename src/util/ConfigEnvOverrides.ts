import { readJson, writeConfigAtomic } from './ConfigSync'

export type OverrideType = 'string' | 'bool' | 'number' | 'array'

export interface EnvOverrideEntry {
    env: string
    path: string // dotted path into config.json
    type: OverrideType
    secret?: boolean // never print the value; applied overrides are logged
}

export const ENV_OVERRIDES: EnvOverrideEntry[] = [
    // General
    { env: 'CONFIG_HEADLESS', path: 'headless', type: 'bool' },
    { env: 'CONFIG_CLUSTERS', path: 'clusters', type: 'number' },
    { env: 'CONFIG_DEBUG_LOGS', path: 'debugLogs', type: 'bool' },
    { env: 'CONFIG_ERROR_DIAGNOSTICS', path: 'errorDiagnostics', type: 'bool' },
    { env: 'CONFIG_ENSURE_STREAK_PROTECTION', path: 'ensureStreakProtection', type: 'bool' },
    { env: 'CONFIG_AUTO_CLAIM_PUNCHCARD_REWARDS', path: 'autoClaimPunchcardRewards', type: 'bool' },
    { env: 'CONFIG_CONTINTUE_ON_BOT_WARNING', path: 'contintueOnBotWarning', type: 'bool' },
    { env: 'CONFIG_SKIP_NON_POINT_TASKS', path: 'skipNonPointTasks', type: 'bool' },
    { env: 'CONFIG_GLOBAL_TIMEOUT', path: 'globalTimeout', type: 'string' },
    { env: 'CONFIG_ACCOUNT_DELAY_MIN', path: 'accountDelay.min', type: 'string' },
    { env: 'CONFIG_ACCOUNT_DELAY_MAX', path: 'accountDelay.max', type: 'string' },

    // Workers
    { env: 'CONFIG_WORKER_DAILY_SET', path: 'workers.doDailySet', type: 'bool' },
    { env: 'CONFIG_WORKER_CLAIM_BONUS_POINTS', path: 'workers.doClaimBonusPoints', type: 'bool' },
    { env: 'CONFIG_WORKER_MORE_PROMOTIONS', path: 'workers.doMorePromotions', type: 'bool' },
    { env: 'CONFIG_WORKER_PUNCH_CARDS', path: 'workers.doPunchCards', type: 'bool' },
    { env: 'CONFIG_WORKER_APP_PROMOTIONS', path: 'workers.doAppPromotions', type: 'bool' },
    { env: 'CONFIG_WORKER_DESKTOP_SEARCH', path: 'workers.doDesktopSearch', type: 'bool' },
    { env: 'CONFIG_WORKER_MOBILE_SEARCH', path: 'workers.doMobileSearch', type: 'bool' },
    { env: 'CONFIG_WORKER_BONUS_SEARCHES', path: 'workers.doBonusSearches', type: 'bool' },
    { env: 'CONFIG_WORKER_DAILY_CHECKIN', path: 'workers.doDailyCheckIn', type: 'bool' },
    { env: 'CONFIG_WORKER_READ_TO_EARN', path: 'workers.doReadToEarn', type: 'bool' },
    { env: 'CONFIG_WORKER_ACTIVATE_SEARCH_PERK', path: 'workers.doActivateSearchPerk', type: 'bool' },
    { env: 'CONFIG_WORKER_VISUAL_SEARCH', path: 'workers.doVisualSearch', type: 'bool' },

    // Search settings
    { env: 'CONFIG_SEARCH_SCROLL_RANDOM', path: 'searchSettings.scrollRandomResults', type: 'bool' },
    { env: 'CONFIG_SEARCH_CLICK_RANDOM', path: 'searchSettings.clickRandomResults', type: 'bool' },
    { env: 'CONFIG_SEARCH_PARALLEL', path: 'searchSettings.parallelSearching', type: 'bool' },
    { env: 'CONFIG_SEARCH_CLUSTER', path: 'searchSettings.clusterSearch', type: 'bool' },
    { env: 'CONFIG_SEARCH_DELAY_MIN', path: 'searchSettings.searchDelay.min', type: 'string' },
    { env: 'CONFIG_SEARCH_DELAY_MAX', path: 'searchSettings.searchDelay.max', type: 'string' },
    { env: 'CONFIG_SEARCH_READ_DELAY_MIN', path: 'searchSettings.readDelay.min', type: 'string' },
    { env: 'CONFIG_SEARCH_READ_DELAY_MAX', path: 'searchSettings.readDelay.max', type: 'string' },
    { env: 'CONFIG_SEARCH_VISIT_TIME', path: 'searchSettings.searchResultVisitTime', type: 'string' },
    { env: 'CONFIG_SEARCH_RUN_ON_ZERO_POINTS', path: 'searchSettings.runOnZeroPoints', type: 'bool' },
    { env: 'CONFIG_SEARCH_MAX_BONUS_SEARCHES', path: 'searchSettings.maxBonusSearches', type: 'number' },
    { env: 'CONFIG_SEARCH_QUERY_ENGINES', path: 'searchSettings.queryEngines', type: 'array' },
    { env: 'CONFIG_SEARCH_ON_BING_LOCAL', path: 'searchOnBingLocalQueries', type: 'bool' },

    // Activities
    { env: 'CONFIG_ACTIVITY_URL_REWARD', path: 'activities.urlReward', type: 'bool' },
    { env: 'CONFIG_ACTIVITY_SEARCH_ON_BING', path: 'activities.searchOnBing', type: 'bool' },

    // Experimental
    { env: 'CONFIG_EXPERIMENTAL_API_SEARCH', path: 'experimental.apiSearch', type: 'bool' },
    { env: 'CONFIG_EXPERIMENTAL_API_SEARCH_ON_BING', path: 'experimental.apiSearchOnBing', type: 'bool' },
    { env: 'CONFIG_EXPERIMENTAL_BLOCK_MEDIA', path: 'experimental.blockMedia', type: 'bool' },
    { env: 'CONFIG_EXPERIMENTAL_EDGE_BROWSING', path: 'experimental.edgeBrowsing', type: 'bool' },

    // Proxy
    { env: 'CONFIG_PROXY_QUERY_ENGINE', path: 'proxy.queryEngine', type: 'bool' },
    { env: 'CONFIG_PROXY_IGNORE_CERTIFICATE_ERRORS', path: 'proxy.ignoreCertificateErrors', type: 'bool' },

    // Console log filter (levels/keywords are comma-separated)
    { env: 'CONFIG_LOG_FILTER_ENABLED', path: 'consoleLogFilter.enabled', type: 'bool' },
    { env: 'CONFIG_LOG_FILTER_MODE', path: 'consoleLogFilter.mode', type: 'string' },
    { env: 'CONFIG_LOG_FILTER_LEVELS', path: 'consoleLogFilter.levels', type: 'array' },
    { env: 'CONFIG_LOG_FILTER_KEYWORDS', path: 'consoleLogFilter.keywords', type: 'array' },

    // Discord webhook
    { env: 'CONFIG_DISCORD_ENABLED', path: 'webhook.discord.enabled', type: 'bool' },
    { env: 'CONFIG_DISCORD_URL', path: 'webhook.discord.url', type: 'string', secret: true },

    // Telegram webhook
    { env: 'CONFIG_TELEGRAM_ENABLED', path: 'webhook.telegram.enabled', type: 'bool' },
    { env: 'CONFIG_TELEGRAM_BOTTOKEN', path: 'webhook.telegram.botToken', type: 'string', secret: true },
    { env: 'CONFIG_TELEGRAM_CHATID', path: 'webhook.telegram.chatId', type: 'string', secret: true },

    // ntfy webhook (tags are comma-separated e.g. "bot,notify")
    { env: 'CONFIG_NTFY_ENABLED', path: 'webhook.ntfy.enabled', type: 'bool' },
    { env: 'CONFIG_NTFY_URL', path: 'webhook.ntfy.url', type: 'string', secret: true },
    { env: 'CONFIG_NTFY_TOPIC', path: 'webhook.ntfy.topic', type: 'string', secret: true },
    { env: 'CONFIG_NTFY_TOKEN', path: 'webhook.ntfy.token', type: 'string', secret: true },
    { env: 'CONFIG_NTFY_TITLE', path: 'webhook.ntfy.title', type: 'string' },
    { env: 'CONFIG_NTFY_PRIORITY', path: 'webhook.ntfy.priority', type: 'number' },
    { env: 'CONFIG_NTFY_TAGS', path: 'webhook.ntfy.tags', type: 'array' },

    // Webhook log filter
    { env: 'CONFIG_WEBHOOK_LOG_FILTER_ENABLED', path: 'webhook.webhookLogFilter.enabled', type: 'bool' },
    { env: 'CONFIG_WEBHOOK_LOG_FILTER_MODE', path: 'webhook.webhookLogFilter.mode', type: 'string' },
    { env: 'CONFIG_WEBHOOK_LOG_FILTER_LEVELS', path: 'webhook.webhookLogFilter.levels', type: 'array' },
    { env: 'CONFIG_WEBHOOK_LOG_FILTER_KEYWORDS', path: 'webhook.webhookLogFilter.keywords', type: 'array' }
]

// Docker images set FORCE_HEADLESS=1 because containers have no display, so
// headless is pinned there and CONFIG_HEADLESS cannot turn it off.
function forcedOverrides(env: NodeJS.ProcessEnv): { path: string; value: unknown }[] {
    const raw = env.FORCE_HEADLESS?.trim().toLowerCase()
    const forced = raw !== undefined && ['1', 'true', 'yes', 'on'].includes(raw)
    return forced ? [{ path: 'headless', value: true }] : []
}

function setDeep(obj: Record<string, unknown>, dottedPath: string, value: unknown): void {
    const parts = dottedPath.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i] as string
        const next = cur[key]
        if (typeof next !== 'object' || next === null || Array.isArray(next)) {
            cur[key] = {}
        }
        cur = cur[key] as Record<string, unknown>
    }
    cur[parts[parts.length - 1] as string] = value
}

// Shells, compose files and CI runners all spell booleans differently, so accept
// the same set Load.ts accepts for its own env flags instead of only true/false.
const TRUE_WORDS = new Set(['1', 'true', 'yes', 'on'])
const FALSE_WORDS = new Set(['0', 'false', 'no', 'off'])

function coerceScalar(raw: string, type: 'bool' | 'number' | 'string', env: string): unknown {
    switch (type) {
        case 'bool': {
            const word = raw.trim().toLowerCase()
            if (TRUE_WORDS.has(word)) return true
            if (FALSE_WORDS.has(word)) return false
            throw new Error(`${env} expects a boolean (true/false, 1/0, yes/no, on/off), got '${raw}'.`)
        }
        case 'number': {
            const n = Number(raw.trim())
            if (!Number.isFinite(n)) throw new Error(`${env} expects a JSON number, got '${raw}'.`)
            return n
        }
        case 'string':
        default:
            return raw
    }
}

const SECRET_ENVS = new Set(ENV_OVERRIDES.filter(entry => entry.secret).map(entry => entry.env))

// Applied overrides get logged, and some of them are webhook URLs and bot tokens.
export function describeOverrideValue(envName: string, value: unknown): string {
    return SECRET_ENVS.has(envName) ? '***' : JSON.stringify(value)
}

export interface ComputedOverride {
    env: string
    path: string
    value: unknown
}

export interface OverrideError {
    env: string
    message: string
}

export function computeOverrides(env: NodeJS.ProcessEnv = process.env): {
    applied: ComputedOverride[]
    errors: OverrideError[]
} {
    const applied: ComputedOverride[] = []
    const errors: OverrideError[] = []

    for (const entry of ENV_OVERRIDES) {
        if (entry.type === 'array') {
            if (!(entry.env in env)) continue
            const raw = env[entry.env] ?? ''
            const value = raw === '' ? [] : raw.split(',').map(s => s.trim())
            applied.push({ env: entry.env, path: entry.path, value })
            continue
        }

        const raw = env[entry.env]
        if (raw === undefined || raw === '') continue
        try {
            const value = coerceScalar(raw, entry.type, entry.env)
            applied.push({ env: entry.env, path: entry.path, value })
        } catch (err) {
            errors.push({ env: entry.env, message: err instanceof Error ? err.message : String(err) })
        }
    }

    return { applied, errors }
}

export interface MergeReport {
    forced: { path: string; value: unknown }[]
    applied: ComputedOverride[]
    errors: OverrideError[]
}

// Merges CONFIG_* overrides into an already-parsed config object. loadConfig()
// calls this on every start so a launcher (Web UI, scheduler, plain shell) only
// has to set the env var - nothing has to rewrite config.json first.
// Unlike applyEnvOverrides this is not all-or-nothing: valid overrides still
// land and the caller decides how loudly to report the rejected ones.
export function mergeEnvOverrides(config: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): MergeReport {
    const { applied, errors } = computeOverrides(env)
    const forced = forcedOverrides(env)
    // applied first, forced last: FORCE_HEADLESS pins headless on and CONFIG_HEADLESS cannot undo it
    for (const { path: p, value } of applied) setDeep(config, p, value)
    for (const { path: p, value } of forced) setDeep(config, p, value)
    return { forced, applied, errors }
}

export interface ApplyReport {
    configPath: string
    forced: { path: string; value: unknown }[]
    applied: ComputedOverride[]
    errors: OverrideError[]
}

export function applyEnvOverrides(configPath: string, env: NodeJS.ProcessEnv = process.env): ApplyReport {
    // Preflight before touching the file: a single bad value must not leave a
    // half-overridden config.json behind.
    const { errors: rejected } = computeOverrides(env)
    if (rejected.length > 0) {
        return { configPath, forced: [], applied: [], errors: rejected }
    }

    const config = readJson(configPath) as Record<string, unknown>
    const { applied, forced } = mergeEnvOverrides(config, env)

    writeConfigAtomic(configPath, config, { backup: false })

    return { configPath, forced, applied, errors: [] }
}

// ── CLI entry point, used by entrypoint.sh ──
if (require.main === module) {
    const args = process.argv.slice(2)
    const command = args[0]

    const printHelp = (): void => {
        console.log(`
Microsoft Rewards CONFIG_* environment overrides

Usage:
  node dist/util/ConfigEnvOverrides.js list [--format table|env]
  node dist/util/ConfigEnvOverrides.js apply --config <path>

Commands:
  list         Show every supported environment override.
  apply        Apply configured overrides to one config.json file.

Options:
  --format     Output format for list. Defaults to table.
  --config     Required config.json path for apply.
  --help       Show this help.

Examples:
  node dist/util/ConfigEnvOverrides.js list
  node dist/util/ConfigEnvOverrides.js list --format env
  node dist/util/ConfigEnvOverrides.js apply --config ./config.json
`)
    }

    const failUsage = (message: string): never => {
        console.error(`[config-overrides] ERROR: ${message}`)
        printHelp()
        process.exit(1)
    }

    const readOnlyOption = (flag: string): string | undefined => {
        const index = args.indexOf(flag)
        if (index === -1) return undefined
        const value = args[index + 1]
        if (!value || value.startsWith('-')) failUsage(`${flag} requires a value after it.`)
        return value
    }

    if (args.includes('--help') || args.includes('-h')) {
        printHelp()
        process.exit(0)
    }
    if (!command) failUsage('Missing command. Choose "list" or "apply".')
    if (command !== 'list' && command !== 'apply') failUsage(`Unknown command "${command}".`)

    if (command === 'list') {
        const format = readOnlyOption('--format') ?? 'table'
        const expectedLength = args.includes('--format') ? 3 : 1
        if (args.length !== expectedLength || !['table', 'env'].includes(format)) {
            failUsage('The list command only accepts --format table or --format env.')
        }
        if (format === 'env') {
            for (const e of ENV_OVERRIDES) console.log(e.env)
        } else {
            console.log('ENV VAR'.padEnd(42) + 'CONFIG PATH'.padEnd(42) + 'TYPE')
            for (const e of ENV_OVERRIDES) {
                console.log(e.env.padEnd(42) + ('.' + e.path).padEnd(42) + e.type)
            }
        }
        process.exit(0)
    }

    if (command === 'apply') {
        const configPath = readOnlyOption('--config') ?? failUsage('The apply command requires --config <path>.')
        if (args.length !== 3) failUsage('The apply command only accepts --config <path>.')
        try {
            const report = applyEnvOverrides(configPath)
            if (report.errors.length > 0) {
                console.error('[entrypoint] Invalid CONFIG_* override value(s) - no changes were written:')
                report.errors.forEach(e => console.error(`[entrypoint]   ${e.message}`))
                process.exit(1)
            }
            report.forced.forEach(f => console.log(`[entrypoint]   .${f.path} = ${f.value} (forced)`))
            report.applied.forEach(a =>
                console.log(`[entrypoint]   .${a.path} = ${describeOverrideValue(a.env, a.value)}`)
            )
            console.log(`[entrypoint] Applied ${report.applied.length} override(s).`)
            process.exit(0)
        } catch (err) {
            console.error(`[entrypoint] ERROR: ${err instanceof Error ? err.message : String(err)}`)
            process.exit(1)
        }
    }
}
