import { MeowClient } from '@/client';
import {
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

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
			await interaction.reply({
				content: 'Guild unknown.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		const client = interaction.client as MeowClient;
		const stopper = client.manualStopper.get(guildId);
		if (!stopper) {
			await interaction.reply({
				content: 'Nothing to stop.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		await stopper();
		client.manualStopper.delete(guildId);
		await interaction.reply({
			content: 'Left and stopped recording.',
			flags: MessageFlags.Ephemeral,
		});
	},
};
