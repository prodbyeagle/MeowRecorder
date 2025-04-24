import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { MeowClient } from '@/client';

import { branding } from '@/lib/config';

import { _stopRecording } from '@/modules/Recorder';

import type { ICommand } from '@/types';

export const leaveCommand: ICommand = {
	name: 'leave',
	description: 'Stop recording and leave the voice channel',
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Stop recording and leave the voice channel')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<void> => {
		const guildId = interaction.guildId;
		if (!guildId) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Guild Unknown')
						.setDescription(
							'This command must be used within a server.'
						)
						.setColor(branding.AccentColor!),
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const client = interaction.client as MeowClient;
		const userId = interaction.user.id;

		let recordingStopped = false;

		try {
			await _stopRecording(userId);
			recordingStopped = true;
		} catch {
			// recording wasn't active, but we still try to leave the VC
		}

		const adapter = client.voice.adapters.get(guildId);

		if (
			adapter &&
			'destroy' in adapter &&
			typeof adapter.destroy === 'function'
		) {
			adapter.destroy();
		}

		const embed = new EmbedBuilder()
			.setTitle(
				recordingStopped
					? 'Left & Stopped Recording'
					: 'Left Voice Channel'
			)
			.setDescription(
				recordingStopped
					? 'The bot stopped recording and left the voice channel.'
					: 'The bot left the voice channel. There was no active recording.'
			)
			.setColor(branding.SuccessColor!);

		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral,
		});
	},
};
