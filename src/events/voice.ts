import type { MeowClient } from '@/client';
import { loadConfig } from '@/modules/configManager';
import { startRecording } from '@/recording/Recorder';
import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { Events, VoiceState } from 'discord.js';

import { logMessage } from '@/lib/utils';

/**
 * Registers the voiceStateUpdate event for auto-join and recording.
 * @param client The Discord client instance.
 */
export const registerVoiceEvents = (client: MeowClient) => {
	client.on(
		Events.VoiceStateUpdate,
		async (oldState: VoiceState, newState: VoiceState) => {
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
					const stop = await startRecording(connection, match.userId);
					const handler = (o: VoiceState, n: VoiceState) => {
						if (
							n.id === match.userId &&
							n.channelId !== match.channelId
						) {
							stop().catch(console.error);
							client.off(Events.VoiceStateUpdate, handler);
						}
					};
					client.on(Events.VoiceStateUpdate, handler);
				});
			} catch (err) {
				logMessage(
					`Auto‐join/record error: ${err instanceof Error ? err.message : err}`,
					'error'
				);
			}
		}
	);
};
