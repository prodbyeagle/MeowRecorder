import { Transform, type TransformCallback } from 'stream';

import { logMessage } from '@/lib/utils';

export interface SilenceFillerOptions {
	/** bytes per PCM frame (samples×channels×2) */
	frameSize: number;
	/** ms per frame */
	frameIntervalMs: number;
}

/**
 * Ensures a steady stream of PCM frames by inserting silence frames when necessary,
 * maintaining consistent timing for real-time audio recording.
 */
export class SilenceFiller extends Transform {
	private buffer = Buffer.alloc(0);
	private silenceFrame: Buffer;
	private nextPushTime: number;
	private frameSize: number;
	private intervalMs: number;

	constructor(private opts: SilenceFillerOptions) {
		super();
		this.frameSize = opts.frameSize;
		this.intervalMs = opts.frameIntervalMs;
		this.silenceFrame = Buffer.alloc(opts.frameSize, 0);
		this.nextPushTime = Date.now() + this.intervalMs;

		logMessage(
			`SilenceFiller initialized (frameSize=${this.frameSize}, intervalMs=${this.intervalMs})`,
			'info'
		);
		this.scheduleNextPush();
	}

	private scheduleNextPush() {
		const now = Date.now();
		const delay = Math.max(0, this.nextPushTime - now);

		setTimeout(() => {
			this.pushFrame();
			this.nextPushTime += this.intervalMs;
			this.scheduleNextPush();
		}, delay);
	}

	private pushFrame() {
		if (this.buffer.length >= this.frameSize) {
			const frame = this.buffer.subarray(0, this.frameSize);
			this.push(frame);
			this.buffer = this.buffer.subarray(this.frameSize);
		} else {
			this.push(this.silenceFrame);
		}
	}

	_transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		cb();
	}

	_flush(cb: TransformCallback) {
		logMessage(
			`Flushing buffer: ${this.buffer.length} bytes remaining`,
			'info'
		);

		while (this.buffer.length >= this.frameSize) {
			const frame = this.buffer.subarray(0, this.frameSize);
			this.push(frame);
			this.buffer = this.buffer.subarray(this.frameSize);
			logMessage(`Flushed audio frame (${frame.length} bytes)`, 'info');
		}

		if (this.buffer.length > 0) {
			const pad = Buffer.alloc(this.frameSize - this.buffer.length, 0);
			const lastFrame = Buffer.concat([this.buffer, pad]);
			this.push(lastFrame);
			logMessage(
				`Flushed padded final frame (original: ${this.buffer.length}, padded: ${lastFrame.length})`,
				'info'
			);
		}

		cb();
	}
}
