/**
 * Sentry Error Reporting Service (Stub)
 *
 * This is a placeholder service. To enable Sentry:
 * 1. npm install @sentry/react-native
 * 2. Add the Sentry plugin to app.json
 * 3. Replace this file with the full implementation
 */

import logger from '../utils/logger';

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface SentryConfig {
    dsn: string;
    environment: string;
    debug: boolean;
    enableAutoSessionTracking: boolean;
    sessionTrackingIntervalMillis: number;
    tracesSampleRate: number;
}

/**
 * Initialize Sentry error reporting (stub - does nothing)
 */
export const initSentry = (_config: Partial<SentryConfig> = {}): void => {
    logger.debug('Sentry not configured - error reporting disabled');
};

/**
 * Capture an exception manually (stub - logs only)
 */
export const captureException = (error: Error, context?: Record<string, unknown>): void => {
    logger.error('Exception captured:', error, context);
};

/**
 * Capture a message (stub - logs only)
 */
export const captureMessage = (message: string, level: SeverityLevel = 'info'): void => {
    logger.info(`[${level}] ${message}`);
};

/**
 * Set user information (stub - does nothing)
 */
export const setUser = (_user: { id?: string; email?: string; username?: string } | null): void => {
    // No-op
};

/**
 * Add breadcrumb (stub - does nothing)
 */
export const addBreadcrumb = (
    _category: string,
    _message: string,
    _data?: Record<string, unknown>
): void => {
    // No-op
};

/**
 * Set a tag (stub - does nothing)
 */
export const setTag = (_key: string, _value: string): void => {
    // No-op
};

/**
 * Track a trip-related event (stub - logs only)
 */
export const trackTripEvent = (
    action: 'created' | 'deleted' | 'viewed',
    tripId: string,
    tripTitle?: string
): void => {
    logger.debug(`Trip ${action}:`, { tripId, tripTitle });
};

/**
 * Wrap a component (stub - returns component unchanged)
 */
export const withSentryErrorBoundary = <T>(component: T): T => component;

export default {
    init: initSentry,
    captureException,
    captureMessage,
    setUser,
    addBreadcrumb,
    setTag,
    trackTripEvent,
    wrap: withSentryErrorBoundary,
};
