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
	format?: 'mp3' | 'wav';
	bitrate?: number;
	sampleRate?: number;
	channels?: number;
	playbackRate?: number;
}

function buildAtempoFilter(rate: number): string {
	const parts: string[] = [];
	let r = rate;
	while (r > 2.0) {
		parts.push('atempo=2.0');
		r /= 2.0;
	}
	while (r < 0.5) {
		parts.push('atempo=0.5');
		r /= 0.5;
	}
	parts.push(`atempo=${r.toFixed(2)}`);
	return parts.join(',');
}

/**
 * Start recording a user's audio from a Discord VoiceConnection.
 *
 * Records continuous PCM (with silence), encodes via ffmpeg,
 * applies atempo filter if playbackRate ≠ 1, and writes out a file.
 */
export async function startRecording(
	connection: VoiceConnection,
	userId: string,
	opts: RecorderOptions = {}
): Promise<() => Promise<void>> {
	const format = opts.format ?? 'mp3';
	const bitrate = opts.bitrate ?? 320;
	const sampleRate = opts.sampleRate ?? 48000;
	const channels = opts.channels ?? 2;
	const rate = opts.playbackRate ?? 1;

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const userDir = path.resolve(__dirname, '../../recordings', userId);
	await fs.promises.mkdir(userDir, { recursive: true });
	const outPath = path.join(userDir, `${timestamp}.${format}`);

	const receiver: VoiceReceiver = connection.receiver;
	const opusStream = receiver
		.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
		.on('error', console.error);

	const decoder = new prism.opus.Decoder({
		rate: sampleRate,
		channels,
		frameSize: 960,
	}).on('error', console.error);

	const frameBytes = 960 * channels * 2;
	const frameMs = (960 / sampleRate) * 1000;
	const filler = new SilenceFiller({
		frameSize: frameBytes,
		frameIntervalMs: frameMs,
	}).on('error', console.error);

	const ff = Ffmpeg()
		.setFfmpegPath(ffmpegPath ?? '')
		.input(filler)
		.inputFormat('s16le')
		.audioChannels(channels)
		.audioFrequency(sampleRate)
		.audioBitrate(bitrate)
		.format(format);

	if (rate !== 1) {
		ff.audioFilters(buildAtempoFilter(rate));
	}

	const finishPromise = new Promise<void>((resolve, reject) => {
		ff.on('end', () => {
			console.log(`✅ Saved ${outPath}`);
			resolve();
		});
		ff.on('error', reject);
	});

	ff.save(outPath);

	opusStream.pipe(decoder).pipe(filler);

	return async () => {
		try {
			opusStream.destroy();
			decoder.destroy();
			filler.end();
			await finishPromise;
		} finally {
			connection.destroy();
		}
	};
}
