'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  videoFile: File;
  videoUrl: string;
  onClipSelected: (startTime: number, endTime: number, thumbnailDataUrl: string) => void;
  onClose: () => void;
}

export default function PPVClipTrimmer({ videoFile, videoUrl, onClipSelected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'thumbnail' | 'clip'>('clip');
  const [thumbnailTime, setThumbnailTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.onloadedmetadata = () => {
      const d = video.duration;
      setDuration(d);
      setEndTime(Math.min(d, 25));
      setThumbnailTime(Math.min(d, 15));
      // Auto-generate thumbnail at 15 seconds
      video.currentTime = Math.min(d, 15);
    };
    video.onseeked = () => {
      captureThumbnail();
    };
    video.ontimeupdate = () => {
      setCurrentTime(video.currentTime);
    };
  }, []);

  const captureThumbnail = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setThumbnailDataUrl(dataUrl);
  };

  const seekToTime = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setThumbnailTime(time);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    if (!thumbnailDataUrl) return;
    if (mode === 'clip') {
      onClipSelected(startTime, endTime, thumbnailDataUrl);
    } else {
      onClipSelected(thumbnailTime, thumbnailTime, thumbnailDataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-hf-card border border-hf-border rounded-3xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hf-border">
          <h3 className="font-display text-lg font-bold">🎬 PPV Setup</h3>
          <button onClick={onClose} className="text-hf-muted hover:text-white">✕</button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 px-6 pt-4">
          <button
            onClick={() => setMode('clip')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'clip' ? 'bg-gradient-hf text-white' : 'bg-hf-dark border border-hf-border text-hf-muted'}`}
          >
            ✂️ Trim Teaser Clip
          </button>
          <button
            onClick={() => setMode('thumbnail')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${mode === 'thumbnail' ? 'bg-gradient-hf text-white' : 'bg-hf-dark border border-hf-border text-hf-muted'}`}
          >
            🖼 Pick Thumbnail Frame
          </button>
        </div>

        {/* Video preview */}
        <div className="px-6 py-4">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full rounded-xl max-h-64 object-contain bg-black"
            controls={false}
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {mode === 'clip' ? (
          <div className="px-6 pb-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-hf-muted font-mono mb-1">
                <span>Start: {formatTime(startTime)}</span>
                <span>Duration: {formatTime(endTime - startTime)}</span>
                <span>End: {formatTime(endTime)}</span>
              </div>
              {/* Start handle */}
              <div className="mb-2">
                <label className="text-xs text-hf-muted mb-1 block">Clip Start</label>
                <input type="range" min={0} max={duration} step={0.1} value={startTime}
                  onChange={e => { const v = parseFloat(e.target.value); if (v < endTime) { setStartTime(v); seekToTime(v); }}}
                  className="w-full accent-hf-orange" />
              </div>
              {/* End handle */}
              <div>
                <label className="text-xs text-hf-muted mb-1 block">Clip End (max 25s)</label>
                <input type="range" min={0} max={duration} step={0.1} value={endTime}
                  onChange={e => { const v = parseFloat(e.target.value); if (v > startTime && v - startTime <= 25) { setEndTime(v); seekToTime(v); }}}
                  className="w-full accent-hf-orange" />
              </div>
              <p className="text-xs text-hf-muted mt-1">Teaser clips: 3–25 seconds. This clip will show as a free preview.</p>
            </div>
            {/* Thumbnail from clip */}
            <div>
              <p className="text-xs text-hf-muted mb-2">Thumbnail frame (drag to pick)</p>
              <input type="range" min={startTime} max={endTime} step={0.1} value={thumbnailTime}
                onChange={e => seekToTime(parseFloat(e.target.value))}
                className="w-full accent-hf-red" />
            </div>
          </div>
        ) : (
          <div className="px-6 pb-4">
            <label className="text-xs text-hf-muted mb-2 block">Drag to pick thumbnail frame</label>
            <input type="range" min={0} max={duration} step={0.1} value={thumbnailTime}
              onChange={e => seekToTime(parseFloat(e.target.value))}
              className="w-full accent-hf-orange" />
            <div className="flex justify-between text-xs text-hf-muted font-mono mt-1">
              <span>0:00</span>
              <span className="text-hf-orange font-bold">{formatTime(thumbnailTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Thumbnail preview */}
        {thumbnailDataUrl && (
          <div className="px-6 pb-4">
            <p className="text-xs text-hf-muted mb-2">Thumbnail preview</p>
            <img src={thumbnailDataUrl} alt="thumbnail" className="w-32 h-20 object-cover rounded-xl border border-hf-border" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-3 bg-hf-dark border border-hf-border rounded-xl text-sm hover:border-hf-muted transition-all">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!thumbnailDataUrl}
            className="flex-1 py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {mode === 'clip' ? '✂️ Use This Clip' : '🖼 Use This Thumbnail'}
          </button>
        </div>
      </div>
    </div>
  );
}
