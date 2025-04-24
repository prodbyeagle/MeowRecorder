import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	EndBehaviorType,
	VoiceConnection,
	VoiceReceiver,
} from '@discordjs/voice';
import type { Client, TextChannel } from 'discord.js';
import ffmpegPath from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';
import prism from 'prism-media';

import { config } from '@/lib/config';
import { logMessage } from '@/lib/utils';

import { SilenceFiller } from '@/modules/SilenceFiller';

import { client } from '..';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RecorderOptions {
	format?: 'mp3' | 'wav';
	bitrate?: number;
}

export const recordings = new Map<
	string,
	{
		opusStream: any;
		decoder: any;
		filler: SilenceFiller;
		pcmStream: fs.WriteStream;
		pcmPath: string;
		outPath: string;
		format: string;
		bitrate: number;
		sampleRate: number;
		channels: number;
	}
>();

export async function startRecording(
	connection: VoiceConnection,
	userId: string,
	opts: RecorderOptions = {}
): Promise<() => Promise<void>> {
	const format = opts.format || 'mp3';
	const bitrate = opts.bitrate || 192;
	const sampleRate = 48000;
	const channels = 2;

	const user = await client.users.fetch(userId);
	const usernameSafe = user.username.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
	const ts = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0]; // YYYYMMDDHHMMSS
	const filename = `${usernameSafe}_${userId}_${ts}`;

	const dir = path.resolve(__dirname, '../../../recordings', userId);
	await fs.promises.mkdir(dir, { recursive: true });

	const pcmPath = path.join(dir, `${filename}.pcm`);
	const outPath = path.join(dir, `${filename}.${format}`);

	logMessage(`Recording started for user: ${userId} (${user.username})`, 'info');

	const receiver: VoiceReceiver = connection.receiver;
	const opusStream = receiver
		.subscribe(userId, { end: { behavior: EndBehaviorType.Manual } })
		.on('error', (err) =>
			logMessage(`Opus stream error: ${err.message}`, 'error')
		);

	const decoder = new prism.opus.Decoder({
		rate: sampleRate,
		channels,
		frameSize: 960,
	}).on('error', (err) =>
		logMessage(`Decoder error: ${err.message}`, 'error')
	);

	const frameBytes = 960 * channels * 2;
	const frameMs = (960 / sampleRate) * 1000;
	const filler = new SilenceFiller({
		frameSize: frameBytes,
		frameIntervalMs: frameMs,
	}).on('error', (err) =>
		logMessage(`Silence filler error: ${err.message}`, 'error')
	);

	const pcmStream = fs.createWriteStream(pcmPath);
	opusStream.pipe(decoder).pipe(filler).pipe(pcmStream);

	recordings.set(userId, {
		opusStream,
		decoder,
		filler,
		pcmStream,
		pcmPath,
		outPath,
		format,
		bitrate,
		sampleRate,
		channels,
	});

	logMessage(`Recording pipeline initialized for user: ${userId}`, 'info');

	return async () => {
		await _stopRecording(userId);
	};
}

export async function _stopRecording(userId: string): Promise<void> {
	const state = recordings.get(userId);
	if (!state) {
		logMessage(`No active recording found for user: ${userId}`, 'warn');
		return;
	}

	logMessage(`Stopping recording for user: ${userId}`, 'info');

	const {
		opusStream,
		decoder,
		filler,
		pcmStream,
		pcmPath,
		outPath,
		format,
		bitrate,
		sampleRate,
		channels,
	} = state;

	try {
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
			ff.once('end', async () => {
				logMessage(`Saved recording to ${outPath}`, 'info');

				try {
					await fs.promises.unlink(pcmPath);
					logMessage(
						`Deleted intermediate PCM file: ${pcmPath}`,
						'info'
					);
				} catch (unlinkErr) {
					logMessage(
						`Failed to delete PCM file: ${(unlinkErr as Error).message}`,
						'warn'
					);
				}

				try {
					const channel = await client.channels.fetch(
						config.recordingChannel
					);
					if (channel?.isTextBased()) {
						await (channel as TextChannel).send({
							files: [outPath],
							content: `🎙️ Recording finished for <@${userId}>`,
						});
						logMessage(
							`Recording sent to channel: ${config.recordingChannel}`,
							'info'
						);
					} else {
						logMessage(
							`Invalid recordingChannel ID or not a text channel.`,
							'warn'
						);
					}
				} catch (err) {
					logMessage(
						`Failed to send recording to channel: ${(err as Error).message}`,
						'error'
					);
				}

				resolve();
			});

			ff.once('error', (err) => {
				logMessage(`FFmpeg error: ${err.message}`, 'error');
				reject(err);
			});
		});

		ff.save(outPath);
		await done;
	} catch (err) {
		logMessage(
			`Failed to stop and convert recording: ${(err as Error).message}`,
			'error'
		);
	} finally {
		recordings.delete(userId);
		logMessage(`Cleaned up recording state for user: ${userId}`, 'info');
	}
}
