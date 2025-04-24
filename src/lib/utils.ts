import { config } from '@/lib/config';

const COLORS = {
	info: '\x1b[36m',
	warn: '\x1b[33m',
	error: '\x1b[31m',
	reset: '\x1b[0m',
};

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

	const color = COLORS[level];
	const reset = COLORS.reset;
	console.log(`${color}${level.toUpperCase()}:${reset} ${message}`);
};
