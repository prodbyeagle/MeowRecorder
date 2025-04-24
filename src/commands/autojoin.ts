import {
	ChannelType,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { addConfig, loadConfig, removeConfig } from '@/logic/configManager';

import type { ICommand } from '@/types';
import type { ConfigEntry } from '@/types/Config';

export const autojoinCommand: ICommand = {
	name: 'autojoin',
	description: 'Manage auto‐join recording triggers',
	data: new SlashCommandBuilder()
		.setName('autojoin')
		.setDescription('Manage auto‐join recording triggers')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((sc) =>
			sc
				.setName('add')
				.setDescription('Start auto‐record when a user joins a channel')
				.addUserOption((o) =>
					o
						.setName('user')
						.setDescription('Target user')
						.setRequired(true)
				)
				.addChannelOption((o) =>
					o
						.setName('channel')
						.setDescription('Voice channel')
						.addChannelTypes(ChannelType.GuildVoice)
						.setRequired(true)
				)
		)
		.addSubcommand((sc) =>
			sc
				.setName('remove')
				.setDescription('Remove auto‐record trigger for a user')
				.addUserOption((o) =>
					o
						.setName('user')
						.setDescription('Target user')
						.setRequired(true)
				)
		),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<void> => {
		const { guild, options } = interaction;
		if (!guild) {
			await interaction.reply({
				content: 'Must be in a guild.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			if (options.getSubcommand() === 'add') {
				const user = options.getUser('user', true);
				const channel = options.getChannel('channel', true);
				const entry: ConfigEntry = {
					guildId: guild.id,
					userId: user.id,
					channelId: channel.id,
				};
				await addConfig(entry);
				await interaction.editReply(
					`✅ Auto‐record added: when <@${user.id}> joins <#${channel.id}>`
				);
			} else {
				const user = options.getUser('user', true);
				const all = await loadConfig();
				const before = all.length;
				await removeConfig(guild.id, user.id, '');
				const after = (await loadConfig()).length;
				if (after === before) {
					throw new Error('No triggers found for that user.');
				}
				await interaction.editReply(
					`🗑️ Auto‐record triggers removed for <@${user.id}>`
				);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			await interaction.editReply(`❌ ${msg}`);
		}
	},
};
