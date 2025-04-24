import { createReadStream } from 'fs';
import wav from 'wav';

/**
 * Converts a raw PCM file to a WAV file.
 * @param pcmPath Path to the .pcm file
 * @param wavPath Path to output .wav file
 * @param sampleRate PCM sample rate (default 48000)
 * @param channels Number of channels (default 2)
 */
export async function WAVConverter(
	pcmPath: string,
	wavPath: string,
	sampleRate = 48000,
	channels = 2
): Promise<void> {
	return new Promise((resolve, reject) => {
		const reader = createReadStream(pcmPath);
		const writer = new wav.FileWriter(wavPath, {
			sampleRate,
			channels,
			bitDepth: 16,
		});
		reader.pipe(writer);
		writer.on('finish', resolve);
		writer.on('error', reject);
		reader.on('error', reject);
	});
}
