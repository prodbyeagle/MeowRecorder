import { joinVoiceChannel } from '@discordjs/voice';
import {
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js';

import { startRecording } from '@/logic/recorder';

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
			await interaction.reply({
				content: 'Join a VC first.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
		try {
			const guild = interaction.guild;
			const voiceChannel = member.voice.channel;
			if (!guild || !voiceChannel) {
				await interaction.reply({
					content: 'Could not resolve guild or voice channel.',
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
				content: '🔴 Recording started!',
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			await interaction.reply({
				content: '❌ Failed to start recording.',
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};
