// src/recording/SilenceFiller.ts
import { Transform, type TransformCallback } from 'stream';

export interface SilenceFillerOptions {
	frameSize: number; // bytes per frame (samples × channels × bytesPerSample)
	frameIntervalMs: number; // how often to emit a frame
}

export class SilenceFiller extends Transform {
	private buffer = Buffer.alloc(0);
	private silenceFrame: Buffer;
	private timer: NodeJS.Timeout;

	constructor(private opts: SilenceFillerOptions) {
		super();
		this.silenceFrame = Buffer.alloc(opts.frameSize, 0);
		this.timer = setInterval(() => this.emitFrame(), opts.frameIntervalMs);
	}

	_transform(chunk: Buffer, _: BufferEncoding, cb: TransformCallback) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		this.flushFullFrames();
		cb();
	}

	_flush(cb: TransformCallback) {
		clearInterval(this.timer);
		// pad & emit any remainder
		while (this.buffer.length > 0) {
			const out = Buffer.alloc(this.opts.frameSize, 0);
			this.buffer.copy(
				out,
				0,
				0,
				Math.min(this.buffer.length, this.opts.frameSize)
			);
			this.buffer = this.buffer.slice(this.opts.frameSize);
			this.push(out);
		}
		cb();
	}

	private flushFullFrames() {
		const { frameSize } = this.opts;
		while (this.buffer.length >= frameSize) {
			this.push(this.buffer.slice(0, frameSize));
			this.buffer = this.buffer.slice(frameSize);
		}
	}

	private emitFrame() {
		if (this.buffer.length === 0) {
			this.push(this.silenceFrame);
		} else {
			// partial or full data → pad to frameSize
			const out = Buffer.alloc(this.opts.frameSize, 0);
			this.buffer.copy(
				out,
				0,
				0,
				Math.min(this.buffer.length, this.opts.frameSize)
			);
			this.buffer = this.buffer.slice(this.opts.frameSize);
			this.push(out);
			this.flushFullFrames();
		}
	}
}
