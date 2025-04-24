import { promises as fs } from 'fs';
import path from 'path';

import type { ConfigEntry } from '@/types/Config';

const CONFIG_PATH = path.resolve(import.meta.dir, '../../config.json');

export const loadConfig = async (): Promise<ConfigEntry[]> => {
	try {
		const data = await fs.readFile(CONFIG_PATH, 'utf-8');
		return JSON.parse(data) as ConfigEntry[];
	} catch {
		return [];
	}
};

export const saveConfig = async (entries: ConfigEntry[]): Promise<void> => {
	await fs.writeFile(CONFIG_PATH, JSON.stringify(entries, null, 2), 'utf-8');
};

export const addConfig = async (entry: ConfigEntry): Promise<void> => {
	const all = await loadConfig();
	const exists = all.some(
		(e) =>
			e.guildId === entry.guildId &&
			e.userId === entry.userId &&
			e.channelId === entry.channelId
	);
	if (exists) throw new Error('This trigger already exists.');
	all.push(entry);
	await saveConfig(all);
};

export const removeConfig = async (
	guildId: string,
	userId: string,
	channelId: string
): Promise<void> => {
	const all = await loadConfig();
	let filtered: ConfigEntry[];
	if (!channelId) {
		filtered = all.filter(
			(e) => !(e.guildId === guildId && e.userId === userId)
		);
	} else {
		filtered = all.filter(
			(e) =>
				!(
					e.guildId === guildId &&
					e.userId === userId &&
					e.channelId === channelId
				)
		);
	}
	if (filtered.length === all.length) throw new Error('No such trigger.');
	await saveConfig(filtered);
};
