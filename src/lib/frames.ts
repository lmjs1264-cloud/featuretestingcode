import type { FrameCapture } from '../types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Failed to seek video'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

export interface ExtractOptions {
  frameCount: number;
  startFraction?: number;
  endFraction?: number;
  maxWidth?: number;
  jpegQuality?: number;
  onProgress?: (done: number, total: number) => void;
}

export async function extractFrames(
  file: File,
  {
    frameCount,
    startFraction = 0,
    endFraction = 1,
    maxWidth = 512,
    jpegQuality = 0.7,
    onProgress,
  }: ExtractOptions,
): Promise<FrameCapture[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('Could not read video metadata. Try a different file/format.'));
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    });

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new Error('Video has no usable duration.');
    }

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
    const height = Math.max(1, Math.round((video.videoHeight || maxWidth) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported in this browser.');

    const start = duration * startFraction;
    const end = duration * endFraction;
    const span = Math.max(end - start, 0.001);

    const frames: FrameCapture[] = [];
    for (let i = 0; i < frameCount; i++) {
      const fraction = frameCount === 1 ? 0.5 : i / (frameCount - 1);
      const t = Math.min(start + span * fraction, duration - 0.05);
      await seekTo(video, Math.max(t, 0));
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      frames.push({ dataUrl, timeLabel: formatTime(t) });
      onProgress?.(i + 1, frameCount);
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
