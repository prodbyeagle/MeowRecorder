import { Client, Collection, GatewayIntentBits } from 'discord.js';

import type { ICommand } from '@/types';

/**
 * Custom Discord client class for the Meow Recorder Bot.
 * Extends the base `Client` class from discord.js and adds additional functionality.
 */
export class MeowClient extends Client {
	public commands: Collection<string, ICommand> = new Collection();

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildVoiceStates,
			],
		});
	}
}
