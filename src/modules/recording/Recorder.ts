import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	EndBehaviorType,
	VoiceConnection,
	VoiceReceiver,
} from '@discordjs/voice';
import ffmpegPath from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';
import prism from 'prism-media';

import { SilenceFiller } from '@/modules/recording/SilenceFiller';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RecorderOptions {
	/** Output format (mp3|wav) */
	format?: 'mp3' | 'wav';
	/** kbps for mp3 */
	bitrate?: number;
	/** input sample rate in Hz */
	sampleRate?: number;
	/** output channels (1 or 2) */
	channels?: number;
	/** playback speed: 1=normal */
	gain?: number;
	/** high-pass cutoff (Hz) to remove low-end rumble */
	highPassHz?: number;
}

/**
 * Start recording a user's audio from a Discord VoiceConnection.
 *
 * @returns a `stop()` fn that will tear down only _that_ user’s pipeline
 */
export async function startRecording(
	connection: VoiceConnection,
	userId: string,
	opts: RecorderOptions = {}
): Promise<() => Promise<void>> {
	const { format = 'mp3', bitrate = 320, sampleRate = 48_000 } = opts;

	const ts = new Date().toISOString().replace(/[:.]/g, '-');
	const dir = path.resolve(__dirname, '../../../recordings', userId);
	await fs.promises.mkdir(dir, { recursive: true });
	const outPath = path.join(dir, `${ts}.${format}`);

	const receiver: VoiceReceiver = connection.receiver;
	const opusStream = receiver
		.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
		.on('error', console.error);

	const decoder = new prism.opus.Decoder({
		rate: sampleRate,
		channels: 1,
		frameSize: 960,
	}).on('error', console.error);

	const frameBytes = 960 * 1 * 2;
	const frameMs = (960 / sampleRate) * 1_000;
	const filler = new SilenceFiller({
		frameSize: frameBytes,
		frameIntervalMs: frameMs,
	}).on('error', console.error);

	const ff = Ffmpeg()
		.setFfmpegPath(ffmpegPath || '')
		.input(filler)
		.inputFormat('s16le')
		.audioChannels(1)
		.audioFrequency(sampleRate)
		.audioBitrate(bitrate)
		.format(format);

	const done = new Promise<void>((resolve, reject) => {
		ff.once('end', () => {
			console.log(`✅ Saved ${outPath}`);
			resolve();
		});
		ff.once('error', reject);
	});

	ff.save(outPath);
	opusStream.pipe(decoder).pipe(filler);

	return async () => {
		opusStream.destroy();
		decoder.destroy();
		filler.end();
		await done;
	};
}
