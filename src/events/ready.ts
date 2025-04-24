import { MeowClient } from '@/client';
import { ActivityType, Events } from 'discord.js';

import { logMessage } from '@/lib/utils';

import { initializeCommands } from '@/events/initializeCommands';

/**
 * Handles the `ClientReady` event.
 * This event is triggered when the bot has successfully logged in and is ready to use.
 * It initializes the bot commands and logs the status.
 *
 * @param client - The MeowClient instance that emits this event.
 */
export const readyEvent = (client: MeowClient) => {
	client.on(Events.ClientReady, async () => {
		if (client.user) {
			try {
				client.user.setPresence({
					activities: [
						{
							type: ActivityType.Custom,
							name: 'custom',
							state: '💀 Crying cause of Psychiatrie. Please help me. I cant handle this.',
						},
					],
					status: 'dnd',
				});

				initializeCommands(client);

				logMessage(
					'Bot is ready and commands are initialized.',
					'info'
				);
			} catch (error) {
				if (error instanceof Error) {
					logMessage(`Error during bot initialization`, 'error');
				} else {
					console.error(`Error during bot initialization`);
				}
			}
		} else {
			logMessage('Client user is undefined. Unable to log in.', 'warn');
		}
	});
};
