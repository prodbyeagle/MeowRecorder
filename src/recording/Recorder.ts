// src/recording/Recorder.ts
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

import { SilenceFiller } from './SilenceFiller';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RecorderOptions {
	format?: 'mp3' | 'wav';
	bitrate?: number; // kbps for mp3
	sampleRate?: number; // Hz
	channels?: number;
	playbackRate?: number; // 1 = normal, >1 = faster, <1 = slower
}

function buildAtempoFilter(rate: number): string {
	const parts: string[] = [];
	let r = rate;
	// ffmpeg atempo supports 0.5–2.0 per filter, chain if needed
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
	const sampleRate = opts.sampleRate ?? 48_000;
	const channels = opts.channels ?? 2;
	const rate = opts.playbackRate ?? 1;

	// prepare output directory & filepath
	const recordingsDir = path.resolve(__dirname, '../../recordings');
	await fs.promises.mkdir(recordingsDir, { recursive: true });
	const outPath = path.join(recordingsDir, `${userId}.${format}`);

	// subscribe to raw Opus packets
	const receiver: VoiceReceiver = connection.receiver;
	const opusStream = receiver
		.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
		.on('error', console.error);

	// decode Opus → PCM s16le
	const decoder = new prism.opus.Decoder({
		rate: sampleRate,
		channels,
		frameSize: 960,
	}).on('error', console.error);

	// insert silence frames on gaps
	const frameBytes = 960 * channels * 2; // samples × channels × bytesPerSample(16-bit)
	const frameMs = (960 / sampleRate) * 1000;
	const filler = new SilenceFiller({
		frameSize: frameBytes,
		frameIntervalMs: frameMs,
	}).on('error', console.error);

	// configure ffmpeg
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

	ff.on('error', console.error)
		.on('end', () => console.log(`✅ Saved ${outPath}`))
		.save(outPath);

	// pipe streams: Opus → PCM → silence-filled → ffmpeg
	opusStream.pipe(decoder).pipe(filler);

	return async () => {
		// stop receiving new audio
		receiver.subscribe(userId);
		opusStream.destroy();
		decoder.destroy();

		// finish filler → signals ffmpeg to flush
		filler.end();

		// wait for ffmpeg to finish writing
		await new Promise<void>((resolve, reject) => {
			ff.once('end', resolve).once('error', reject);
		});

		connection.destroy();
	};
}
