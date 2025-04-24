import { MeowClient } from '@/client';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { branding } from '@/lib/config';

import type { ICommand } from '@/types';

export const leaveCommand: ICommand = {
	name: 'leave',
	description: 'Stop manual recording and leave VC',
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Stop manual recording and leave VC')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<void> => {
		const guildId = interaction.guildId;
		if (!guildId) {
			const embed = new EmbedBuilder()
				.setTitle('Guild Unknown')
				.setDescription('This command must be run in a server.')
				.setColor(branding.AccentColor!);
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const client = interaction.client as MeowClient;
		const stopper = client.manualStopper.get(guildId);
		if (!stopper) {
			const embed = new EmbedBuilder()
				.setTitle('Nothing to Stop')
				.setDescription('There is no active recording to stop.')
				.setColor(branding.InfoColor!);
			await interaction.reply({
				embeds: [embed],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		await stopper();
		client.manualStopper.delete(guildId);
		const embed = new EmbedBuilder()
			.setTitle('Left & Stopped Recording')
			.setDescription(
				'The bot has left the voice channel and stopped recording.'
			)
			.setColor(branding.SuccessColor!);
		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral,
		});
	},
};
