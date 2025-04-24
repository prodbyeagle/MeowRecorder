import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import {
	EndBehaviorType,
	VoiceConnection,
	VoiceReceiver,
} from '@discordjs/voice';

export const startRecording = async (
	connection: VoiceConnection,
	guildId: string,
	userId: string
): Promise<() => Promise<void>> => {
	const recordingsDir = path.resolve(import.meta.dir, '../../recordings');
	await fs.mkdir(recordingsDir, { recursive: true });

	const timestamp = Date.now();
	const filename = `${guildId}_${userId}_${timestamp}.pcm`;
	const filepath = path.join(recordingsDir, filename);
	const receiver: VoiceReceiver = connection.receiver;

	const opusStream = receiver.subscribe(userId, {
		end: { behavior: EndBehaviorType.Manual },
	});
	const output = createWriteStream(filepath);
	opusStream.pipe(output);

	// return a stopper fn
	return async () => {
		opusStream.destroy();
		output.end();
		connection.destroy();
	};
};
