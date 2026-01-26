/**
 * Logger utility - Disables logs in production
 * Provides centralized logging with environment-based filtering
 */

const IS_PRODUCTION = !__DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabledInProduction: boolean;
    minLevel: LogLevel;
}

const defaultConfig: LoggerConfig = {
    enabledInProduction: false,
    minLevel: 'debug',
};

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private config: LoggerConfig;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...defaultConfig, ...config };
    }

    private shouldLog(level: LogLevel): boolean {
        if (IS_PRODUCTION && !this.config.enabledInProduction) {
            return false;
        }
        return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
    }

    debug(...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.log('[DEBUG]', ...args);
        }
    }

    info(...args: unknown[]): void {
        if (this.shouldLog('info')) {
            console.log('[INFO]', ...args);
        }
    }

    warn(...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn('[WARN]', ...args);
        }
    }

    error(...args: unknown[]): void {
        if (this.shouldLog('error')) {
            console.error('[ERROR]', ...args);
        }
    }
}

// Singleton instance
const logger = new Logger();

export default logger;
export { Logger, LoggerConfig };
