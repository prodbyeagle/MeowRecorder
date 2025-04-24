import { Transform, type TransformCallback } from 'stream';

export interface SilenceFillerOptions {
	/** bytes per PCM frame (samples×channels×2) */
	frameSize: number;
	/** ms of silence to wait before inserting one frame */
	frameIntervalMs: number;
}

/**
 * Inserts exactly one silence‐frame after each gap of `frameIntervalMs`,
 * then waits again. Real audio data is never interleaved with silence.
 */
export class SilenceFiller extends Transform {
	private buffer = Buffer.alloc(0);
	private silenceFrame: Buffer;
	private timer: NodeJS.Timeout | null = null;

	constructor(private opts: SilenceFillerOptions) {
		super();
		this.silenceFrame = Buffer.alloc(opts.frameSize, 0);
	}

	_transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
		// 1) clear any pending silence
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		// 2) buffer incoming
		this.buffer = Buffer.concat([this.buffer, chunk]);

		// 3) flush all full frames
		this.flushFullFrames();

		// 4) schedule first silence after gap
		this.scheduleSilence();

		cb();
	}

	_flush(cb: TransformCallback) {
		// stop any future silence
		if (this.timer) clearTimeout(this.timer);

		// flush remainder (pad with zeros)
		while (this.buffer.length > 0) {
			const out = Buffer.alloc(this.opts.frameSize, 0);
			const slice = this.buffer.subarray(0, this.opts.frameSize);
			slice.copy(out);
			this.push(out);
			this.buffer = this.buffer.subarray(this.opts.frameSize);
		}
		cb();
	}

	/** Immediately push all complete frames from the buffer */
	private flushFullFrames() {
		const { frameSize } = this.opts;
		while (this.buffer.length >= frameSize) {
			this.push(this.buffer.subarray(0, frameSize));
			this.buffer = this.buffer.subarray(frameSize);
		}
	}

	/** After a silence gap, emit one silence frame, then wait for next gap. */
	private scheduleSilence() {
		if (this.timer) return;
		this.timer = setTimeout(() => {
			this.push(this.silenceFrame);
			this.timer = null;
			// after pushing silence, wait again for next gap
			this.scheduleSilence();
		}, this.opts.frameIntervalMs);
	}
}
