import { Transform, type TransformCallback } from 'stream';

export interface SilenceFillerOptions {
	/** Number of bytes in a single PCM frame (e.g. 960 samples × channels × 2 bytes) */
	frameSize: number;
	/** Interval (ms) to insert silence frames if no data has arrived */
	frameIntervalMs: number;
}

/**
 * A transform stream that ensures consistent frame output even when no audio is received.
 *
 * It fills in silence (`0x00`) PCM frames at a fixed interval when no audio data is flowing through,
 * to maintain timing integrity for downstream consumers like FFmpeg.
 *
 * Example use case:
 * - Discord voice packets can be bursty or silent during gaps.
 * - FFmpeg requires a continuous stream to avoid early EOF.
 */
export class SilenceFiller extends Transform {
	private buffer = Buffer.alloc(0);
	private silenceFrame: Buffer;
	private timer: NodeJS.Timeout;

	constructor(private opts: SilenceFillerOptions) {
		super();
		this.silenceFrame = Buffer.alloc(opts.frameSize, 0);

		this.timer = setInterval(() => this.emitFrame(), opts.frameIntervalMs);
	}

	/**
	 * Handles incoming chunks by buffering them and emitting full-size PCM frames downstream.
	 */
	_transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		this.flushFullFrames();
		cb();
	}

	/**
	 * Ensures any remaining partial data is padded and pushed,
	 * and stops the silence timer when stream ends.
	 */
	_flush(cb: TransformCallback) {
		clearInterval(this.timer);

		while (this.buffer.length > 0) {
			const out = Buffer.alloc(this.opts.frameSize, 0);
			this.buffer
				.subarray(0, Math.min(this.buffer.length, this.opts.frameSize))
				.copy(out);
			this.buffer = this.buffer.subarray(this.opts.frameSize);
			this.push(out);
		}
		cb();
	}

	/**
	 * Emits full frames from the buffer while available.
	 */
	private flushFullFrames() {
		const { frameSize } = this.opts;
		while (this.buffer.length >= frameSize) {
			this.push(this.buffer.subarray(0, frameSize));
			this.buffer = this.buffer.subarray(frameSize);
		}
	}

	/**
	 * Called at fixed intervals. Emits a silence frame if buffer is empty,
	 * or a partial frame followed by any complete frames in the buffer.
	 */
	private emitFrame() {
		const { frameSize } = this.opts;

		if (this.buffer.length === 0) {
			this.push(this.silenceFrame);
			return;
		}

		const out = Buffer.alloc(frameSize, 0);
		this.buffer
			.subarray(0, Math.min(this.buffer.length, frameSize))
			.copy(out);
		this.buffer = this.buffer.subarray(frameSize);

		this.push(out);
		this.flushFullFrames();
	}
}
