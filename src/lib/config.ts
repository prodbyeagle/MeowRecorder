import type { ColorResolvable } from 'discord.js';

export const config = {
	token: process.env.BOT_TOKEN || 'discord_bot_key',
	supabaseUrl: process.env.SUPABASE_URL || 'supabase_key',
	supabaseKey: process.env.ANON_KEY || 'anon_key',
	databaseUrl: process.env.DATABASE_URL || 'database_url',
	dev: true,
};

//? all colors for embeds.
export const branding: Record<string, ColorResolvable> = {
	AccentColor: '#ee2737',
	SuccessColor: '#2ecc71',
	WarningColor: '#f39c12',
	InfoColor: '#3498db',
};
