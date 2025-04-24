import {
	joinVoiceChannel,
	VoiceConnection,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import { Events, VoiceState } from 'discord.js';

import type { MeowClient } from '@/client';

import { logMessage } from '@/lib/utils';

import { loadConfig } from '@/modules/configManager';
import { startRecording } from '@/modules/recording/Recorder';

type StopFn = () => Promise<void>;

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

			let connection: VoiceConnection;
			const active = new Map<string, StopFn>();

			try {
				connection = joinVoiceChannel({
					channelId: match.channelId,
					guildId: match.guildId,
					adapterCreator: newState.guild.voiceAdapterCreator,
					selfDeaf: false,
					selfMute: true,
				});

				connection.once(VoiceConnectionStatus.Ready, async () => {
					const vc = await newState.guild.channels.fetch(
						match.channelId
					);
					if (!vc?.isVoiceBased()) return;
					for (const m of vc.members.values()) {
						if (!m.user.bot) {
							try {
								const stop = await startRecording(
									connection,
									m.id
								);
								active.set(m.id, stop);
							} catch (e) {
								logMessage(
									`Recording error [${m.id}]: ${e}`,
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

					if (left && active.has(o.id)) {
						await active.get(o.id)!().catch(console.error);
						active.delete(o.id);
					}
					if (joined && !active.has(n.id) && !n.member?.user.bot) {
						try {
							const stop = await startRecording(connection, n.id);
							active.set(n.id, stop);
						} catch (e) {
							logMessage(
								`Failed to start recording [${n.id}]: ${e}`,
								'error'
							);
						}
					}

					if (
						n.id === match.userId &&
						n.channelId !== match.channelId
					) {
						client.off(Events.VoiceStateUpdate, handler);

						for (const stop of active.values()) {
							await stop().catch(console.error);
						}
						active.clear();

						if (
							connection.state.status !==
							VoiceConnectionStatus.Destroyed
						) {
							connection.destroy();
						}
					}
				};

				client.on(Events.VoiceStateUpdate, handler);
			} catch (err) {
				logMessage(`Auto-join/record error: ${err}`, 'error');
			}
		}
	);
};
