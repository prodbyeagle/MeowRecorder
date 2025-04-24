import { MeowClient } from './client';
import { config } from './config/config';
import { interactionCreateEvent } from './events/interaction';
import { readyEvent } from './events/ready';
import { registerVoiceEvents } from './events/voice';
import { logMessage } from './lib/utils';

/**
 * Initializes the bot client, event listeners, and handles bot login.
 */
const initializeBot = async () => {
	try {
		const client = new MeowClient();

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
