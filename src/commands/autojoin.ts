import { addConfig, loadConfig, removeConfig } from '@/modules/configManager';
import {
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { branding } from '@/lib/config';

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
			const embed = new EmbedBuilder()
				.setTitle('Guild Only')
				.setDescription('This command must be used in a guild.')
				.setColor(branding.AccentColor!);
			await interaction.reply({
				embeds: [embed],
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
				const embed = new EmbedBuilder()
					.setTitle('Auto-record Added')
					.setDescription(
						`When <@${user.id}> joins <#${channel.id}> recording will start automatically.`
					)
					.setColor(branding.SuccessColor!);
				await interaction.editReply({
					embeds: [embed],
				});
			} else {
				const user = options.getUser('user', true);
				const all = await loadConfig();
				const before = all.length;
				await removeConfig(guild.id, user.id, '');
				const after = (await loadConfig()).length;
				if (after === before) {
					throw new Error('No triggers found for that user.');
				}
				const embed = new EmbedBuilder()
					.setTitle('Auto-record Triggers Removed')
					.setDescription(
						`All auto-record triggers removed for <@${user.id}>.`
					)
					.setColor(branding.InfoColor!);
				await interaction.editReply({
					embeds: [embed],
				});
			}
		} catch (err: unknown) {
			const embed = new EmbedBuilder()
				.setTitle('Error')
				.setDescription(
					err instanceof Error ? err.message : 'Unknown error'
				)
				.setColor(branding.AccentColor!);
			await interaction.editReply({
				embeds: [embed],
			});
		}
	},
};
