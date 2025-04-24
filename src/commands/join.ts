import { joinVoiceChannel } from '@discordjs/voice';
import {
	ChannelType,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { branding } from '@/lib/config';

import { startRecording } from '@/modules/Recorder';

import type { ICommand } from '@/types';

export const joinCommand: ICommand = {
	name: 'join',
	description: 'Bot joins a voice channel and records',
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Bot joins a voice channel and starts recording')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption((option) =>
			option
				.setName('channel')
				.setDescription('Optional voice channel to join')
				.addChannelTypes(ChannelType.GuildVoice)
				.setRequired(false)
		),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<void> => {
		const selectedChannel = interaction.options.getChannel('channel');
		const member = interaction.member;

		if (!member || !('voice' in member)) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('❌ Error')
						.setDescription('Could not resolve member voice state.')
						.setColor(branding.AccentColor!),
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const fallbackChannel = member.voice.channel;
		const voiceChannel =
			(selectedChannel?.type === ChannelType.GuildVoice
				? selectedChannel
				: null) ?? fallbackChannel;

		if (!voiceChannel) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Voice Channel Required')
						.setDescription(
							'Join a voice channel or specify one using the `channel` option.'
						)
						.setColor(branding.InfoColor!),
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		try {
			const guild = interaction.guild;
			if (!guild) {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle('🚫 Could Not Join')
							.setDescription('Guild not found.')
							.setColor(branding.AccentColor!),
					],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: guild.id,
				adapterCreator: guild.voiceAdapterCreator,
			});

			await startRecording(connection, interaction.user.id);

			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('Recording Started')
						.setDescription(
							`🔴 Recording in **${voiceChannel.name}**`
						)
						.setColor(branding.SuccessColor!),
				],
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle('❌ Error')
						.setDescription(
							'Failed to join the voice channel and start recording.'
						)
						.setColor(branding.AccentColor!),
				],
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
