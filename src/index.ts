import { MeowClient } from './client';
import { interactionCreateEvent } from './events/interaction';
import { readyEvent } from './events/ready';
import { registerVoiceEvents } from './events/voice';
import { config } from './lib/config';
import { logMessage } from './lib/utils';

export const client = new MeowClient();

/**
 * Initializes the bot client, event listeners, and handles bot login.
 */
const initializeBot = async () => {
	try {
		readyEvent(client);
		interactionCreateEvent(client);
		registerVoiceEvents(client);

		await client.login(config.token);

		logMessage('Bot successfully logged in and ready!', 'info');
	} catch (err) {
		logMessage(
			`Error during bot initialization: ${
				err instanceof Error ? err.message : err
			}`,
			'error'
		);
	}
};

initializeBot();
