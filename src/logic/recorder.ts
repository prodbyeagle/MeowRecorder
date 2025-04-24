import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import {
	EndBehaviorType,
	VoiceConnection,
	VoiceReceiver,
} from '@discordjs/voice';
import prism from 'prism-media';

import { WAVConverter } from './pcmToWav';

export const startRecording = async (
	connection: VoiceConnection,
	userId: string
): Promise<() => Promise<void>> => {
	const recordingsDir = path.resolve(import.meta.dir, '../../recordings');
	await fs.mkdir(recordingsDir, { recursive: true });

	const filename = `${userId}.pcm`;
	const filepath = path.join(recordingsDir, filename);
	const receiver: VoiceReceiver = connection.receiver;

	const opusStream = receiver.subscribe(userId, {
		end: { behavior: EndBehaviorType.Manual },
	});

	const opusDecoder = new prism.opus.Decoder({
		rate: 48000,
		channels: 2,
		frameSize: 960,
	});

	const output = createWriteStream(filepath);

	opusStream.on('error', (err) => {
		console.error('Opus stream error:', err);
	});
	opusDecoder.on('error', (err) => {
		console.error('Opus decoder error:', err);
	});
	output.on('error', (err) => {
		console.error('File write error:', err);
	});

	opusStream.pipe(opusDecoder).pipe(output);

	return async () => {
		await new Promise((res) => setTimeout(res, 500));
		opusStream.destroy();
		opusDecoder.destroy();
		output.end();
		connection.destroy();

		const wavPath = filepath.replace(/\.pcm$/, '.wav');
		try {
			await WAVConverter(filepath, wavPath);
			console.log(`Converted to WAV: ${wavPath}`);
		} catch (err) {
			console.error('PCM to WAV conversion failed:', err);
		}
		console.log('Recording stopped.');
	};
};
