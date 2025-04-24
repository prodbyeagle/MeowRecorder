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
}

/**
 * Start recording a user's audio from a Discord VoiceConnection.
 * Records audio as PCM and converts to the specified format when stopped.
 *
 * @returns a `stop()` fn that will tear down the pipeline and convert the PCM file
 */
export async function startRecording(
	connection: VoiceConnection,
	userId: string,
	opts: RecorderOptions = {}
): Promise<() => Promise<void>> {
	const format = opts.format || 'mp3';
	const bitrate = opts.bitrate || 192;
	const sampleRate = 48000;
	const channels = 2;

	const ts = new Date().toISOString().replace(/[:.]/g, '-');
	const dir = path.resolve(__dirname, '../../../recordings', userId);
	await fs.promises.mkdir(dir, { recursive: true });
	const pcmPath = path.join(dir, `${ts}.pcm`);
	const outPath = path.join(dir, `${ts}.${format}`);

	const receiver: VoiceReceiver = connection.receiver;
	const opusStream = receiver
		.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
		.on('error', console.error);

	const decoder = new prism.opus.Decoder({
		rate: sampleRate,
		channels: channels,
		frameSize: 960,
	}).on('error', console.error);

	const frameBytes = 960 * channels * 2;
	const frameMs = (960 / sampleRate) * 1000; // 20ms
	const filler = new SilenceFiller({
		frameSize: frameBytes,
		frameIntervalMs: frameMs,
	}).on('error', console.error);

	const pcmStream = fs.createWriteStream(pcmPath);
	opusStream.pipe(decoder).pipe(filler).pipe(pcmStream);

	return async () => {
		opusStream.destroy();
		decoder.destroy();
		filler.end();
		await new Promise<void>((resolve) => pcmStream.on('finish', resolve));

		const ff = Ffmpeg()
			.setFfmpegPath(ffmpegPath || '')
			.input(pcmPath)
			.inputFormat('s16le')
			.inputOptions([`-ar ${sampleRate}`, `-ac ${channels}`])
			.outputOptions([`-ac ${channels}`])
			.format(format);

		if (format === 'mp3') {
			ff.audioBitrate(bitrate);
		}

		const done = new Promise<void>((resolve, reject) => {
			ff.once('end', () => {
				console.log(`✅ Saved ${outPath}`);
				resolve();
			});
			ff.once('error', reject);
		});

		ff.save(outPath);
		await done;
	};
}
