import { REST, Routes } from 'discord.js';

import { autojoinCommand } from '@/commands/autojoin';
import { joinCommand } from '@/commands/join';
import { leaveCommand } from '@/commands/leave';

import { MeowClient } from '@/client';

import { config } from '@/lib/config';
import { logMessage } from '@/lib/utils';

import type { ICommand } from '@/types';

export const initializeCommands = async (client: MeowClient) => {
	const rest = new REST({ version: '10' }).setToken(config.token);

	const commands = new Map<string, ICommand>();

	const allCommands: ICommand[] = [
		joinCommand,
		leaveCommand,
		autojoinCommand,
	];

	for (const command of allCommands) {
		commands.set(command.name, command);
		client.commands.set(command.name, command);
	}

	if (!client.user) {
		logMessage(
			'Client user is undefined. Unable to register commands.',
			'error'
		);
		return;
	}
	try {
		await rest.put(Routes.applicationCommands(client.user.id), {
			body: Array.from(commands.values()).map((command) =>
				command.data.toJSON()
			),
		});
		logMessage('Commands successfully registered.', 'info');
	} catch (error) {
		logMessage(
			`Error while refreshing commands: ${
				error instanceof Error ? error.message : String(error)
			}`,
			'error'
		);
	}
};
