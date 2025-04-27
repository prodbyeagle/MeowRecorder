import type { ColorResolvable } from 'discord.js';

export const config = {
	token: process.env.BOT_TOKEN || 'discord_bot_key',
	dev: true,
	recordingChannel: '1365111820104503356', // channel where the recording will be sent. (large files not)
};

//? all colors for embeds.
export const branding: Record<string, ColorResolvable> = {
	AccentColor: '#ee2737',
	SuccessColor: '#2ecc71',
	WarningColor: '#f39c12',
	InfoColor: '#3498db',
};
