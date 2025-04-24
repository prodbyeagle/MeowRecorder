import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { Events, VoiceState } from 'discord.js';

import type { MeowClient } from '@/client';

import { logMessage } from '@/lib/utils';

import { loadConfig } from '@/modules/configManager';
import { startRecording } from '@/modules/recording/Recorder';

type ActiveRecordingMap = Map<string, () => Promise<void>>;

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
				(cfg) =>
					cfg.guildId === newState.guild.id &&
					cfg.userId === newState.id &&
					cfg.channelId === newState.channelId
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

				const activeRecordings: ActiveRecordingMap = new Map();

				connection.once(VoiceConnectionStatus.Ready, async () => {
					const voiceChannel = await newState.guild.channels.fetch(
						match.channelId
					);
					if (!voiceChannel?.isVoiceBased()) return;

					for (const member of voiceChannel.members.values()) {
						if (!member.user.bot) {
							try {
								const stop = await startRecording(
									connection,
									member.id
								);
								activeRecordings.set(member.id, stop);
							} catch (err) {
								logMessage(
									`Recording error for ${member.id}: ${String(err)}`,
									'error'
								);
							}
						}
					}
				});

				const handler = async (o: VoiceState, n: VoiceState) => {
					const left =
						o.channelId === match.channelId &&
						n.channelId !== match.channelId;
					const joined =
						n.channelId === match.channelId &&
						o.channelId !== match.channelId;

					if (left && activeRecordings.has(n.id)) {
						const stop = activeRecordings.get(n.id);
						if (stop) {
							await stop().catch(console.error);
							activeRecordings.delete(n.id);
						}
					}

					if (
						joined &&
						!activeRecordings.has(n.id) &&
						!n.member?.user.bot
					) {
						try {
							const stop = await startRecording(connection, n.id);
							activeRecordings.set(n.id, stop);
						} catch (err) {
							logMessage(
								`Failed to start recording for ${n.id}: ${String(err)}`,
								'error'
							);
						}
					}

					if (
						n.id === match.userId &&
						n.channelId !== match.channelId
					) {
						for (const stop of activeRecordings.values()) {
							await stop().catch(console.error);
						}
						activeRecordings.clear();
						connection.destroy();
						client.off(Events.VoiceStateUpdate, handler);
					}
				};

				client.on(Events.VoiceStateUpdate, handler);
			} catch (err) {
				logMessage(
					`Auto‐join/record error: ${err instanceof Error ? err.message : err}`,
					'error'
				);
			}
		}
	);
};
