import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { VoiceState } from 'discord.js';

import { MeowClient } from './client';
import { config } from './config/config';
import { interactionCreateEvent } from './events/interaction';
import { readyEvent } from './events/ready';
import { voiceStateUpdateEvent } from './events/voice';
import { loadConfig } from './logic/configManager';
import { startRecording } from './logic/recorder';

const client = new MeowClient();

readyEvent(client);
interactionCreateEvent(client);
voiceStateUpdateEvent(client);

//TODO: move into /src/events/voice.ts
client.on('voiceStateUpdate', async (oldState, newState) => {
	if (oldState.channelId === newState.channelId) return;
	const cfgs = await loadConfig();
	const match = cfgs.find(
		(c) =>
			c.guildId === newState.guild.id &&
			c.userId === newState.id &&
			c.channelId === newState.channelId
	);
	if (!match) return;

	try {
		const connection = joinVoiceChannel({
			channelId: match.channelId,
			guildId: match.guildId,
			adapterCreator: newState.guild.voiceAdapterCreator,
			selfDeaf: false,
			selfMute: true,
		});
		connection.on(VoiceConnectionStatus.Ready, async () => {
			const stop = await startRecording(
				connection,
				match.guildId,
				match.userId
			);
			const handler = (o: VoiceState, n: VoiceState) => {
				if (n.id === match.userId && n.channelId !== match.channelId) {
					stop().catch(console.error);
					client.off('voiceStateUpdate', handler);
				}
			};
			client.on('voiceStateUpdate', handler);
		});
	} catch (err) {
		console.error('Auto‐join/record error:', err);
	}
});

if (!config.token) {
	console.error('Missing BOT_TOKEN');
	process.exit(1);
}
client.login(config.token);

// Global error handling
process.on('unhandledRejection', (reason) => {
	console.error('Unhandled Rejection:', reason);
});
