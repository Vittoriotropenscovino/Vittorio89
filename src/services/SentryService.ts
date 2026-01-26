/**
 * Sentry Error Reporting Service
 * Provides centralized error tracking and analytics
 */

import * as Sentry from '@sentry/react-native';
import logger from '../utils/logger';

// Configuration constants
// Replace with your actual Sentry DSN from https://sentry.io
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const IS_PRODUCTION = !__DEV__;

interface SentryConfig {
    dsn: string;
    environment: string;
    debug: boolean;
    enableAutoSessionTracking: boolean;
    sessionTrackingIntervalMillis: number;
    tracesSampleRate: number;
}

const defaultConfig: SentryConfig = {
    dsn: SENTRY_DSN,
    environment: IS_PRODUCTION ? 'production' : 'development',
    debug: !IS_PRODUCTION,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0, // 20% in prod, 100% in dev
};

/**
 * Initialize Sentry error reporting
 * Call this in App.tsx before rendering
 */
export const initSentry = (config: Partial<SentryConfig> = {}): void => {
    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.dsn) {
        logger.warn('Sentry DSN not configured. Error reporting disabled.');
        return;
    }

    try {
        Sentry.init({
            dsn: finalConfig.dsn,
            environment: finalConfig.environment,
            debug: finalConfig.debug,
            enableAutoSessionTracking: finalConfig.enableAutoSessionTracking,
            sessionTrackingIntervalMillis: finalConfig.sessionTrackingIntervalMillis,
            tracesSampleRate: finalConfig.tracesSampleRate,
            // Performance monitoring
            integrations: [
                Sentry.reactNativeTracingIntegration(),
            ],
        });

        logger.info('Sentry initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize Sentry:', error);
    }
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, unknown>): void => {
    if (context) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureException(error);
        });
    } else {
        Sentry.captureException(error);
    }
};

/**
 * Capture a message (for non-error events)
 */
export const captureMessage = (
    message: string,
    level: Sentry.SeverityLevel = 'info'
): void => {
    Sentry.captureMessage(message, level);
};

/**
 * Set user information for error tracking
 */
export const setUser = (user: { id?: string; email?: string; username?: string } | null): void => {
    Sentry.setUser(user);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
    category: string,
    message: string,
    data?: Record<string, unknown>
): void => {
    Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
    });
};

/**
 * Set a tag for filtering errors
 */
export const setTag = (key: string, value: string): void => {
    Sentry.setTag(key, value);
};

/**
 * Track a trip-related event
 */
export const trackTripEvent = (
    action: 'created' | 'deleted' | 'viewed',
    tripId: string,
    tripTitle?: string
): void => {
    addBreadcrumb('trip', `Trip ${action}`, {
        tripId,
        tripTitle,
        action,
    });
};

/**
 * Wrap a component with Sentry error boundary
 */
export const withSentryErrorBoundary = Sentry.wrap;

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
