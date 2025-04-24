import { joinVoiceChannel } from '@discordjs/voice';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { branding } from '@/lib/config';

import { startRecording } from '@/modules/recording/Recorder';

import type { ICommand } from '@/types';

export const joinCommand: ICommand = {
	name: 'join',
	description: 'Bot joins your voice channel and records you',
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Bot joins your voice channel and records you')
		.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
	execute: async (
		interaction: ChatInputCommandInteraction
	): Promise<void> => {
		const member = interaction.member;
		if (!member || !('voice' in member) || !member.voice.channel) {
			const embed = new EmbedBuilder()
				.setTitle('Voice Channel Required')
				.setDescription('Join a voice channel first.')
				.setColor(branding.InfoColor!);
			await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
			return;
		}
		try {
			const guild = interaction.guild;
			const voiceChannel = member.voice.channel;
			if (!guild || !voiceChannel) {
				const embed = new EmbedBuilder()
					.setTitle('🚫 Could Not Join')
					.setDescription('Could not resolve guild or voice channel.')
					.setColor(branding.AccentColor!);
				await interaction.reply({
					embeds: [embed],
					flags: 'Ephemeral',
				});
				return;
			}

			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: guild.id,
				adapterCreator: guild.voiceAdapterCreator,
			});

			await startRecording(connection, interaction.user.id);
			const embed = new EmbedBuilder()
				.setTitle('Recording Started')
				.setDescription('🔴 Recording started!')
				.setColor(branding.SuccessColor!);
			await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
		} catch (err) {
			const embed = new EmbedBuilder()
				.setTitle('Error')
				.setDescription('❌ Failed to start recording.')
				.setColor(branding.AccentColor!);
			await interaction.reply({ embeds: [embed], flags: 'Ephemeral' });
		}
	},
};
