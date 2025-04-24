import { config } from '@/config/config';

/**
 * Logs the provided message with color-coded log levels.
 *
 * If `level` is 'info' and debugging is disabled, the message is not logged.
 *
 * @param message - The message to log.
 * @param level - The log level: 'info', 'warn', or 'error'.
 */
export const logMessage = (
	message: string,
	level: 'info' | 'warn' | 'error' = 'info'
): void => {
	if (level === 'info' && !config.dev) return;
	console[level](`${level.toUpperCase()}: ${message}`);
};
