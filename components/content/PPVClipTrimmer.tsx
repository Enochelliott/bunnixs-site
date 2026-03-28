'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  videoUrl: string;
  onConfirm: (startTime: number, clipLength: number) => void;
  onClose: () => void;
}

const MAX_CLIP = 15;
const MIN_CLIP = 3;

export default function PPVClipTrimmer({ videoUrl, onConfirm, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(15);
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef<NodeJS.Timeout>();
  const dragging = useRef<'start' | 'end' | 'bar' | null>(null);
  const dragStartX = useRef(0);
  const dragStartValues = useRef({ start: 0, end: 15 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.onloadedmetadata = () => {
      const d = video.duration;
      setDuration(d);
      const clipEnd = Math.min(MAX_CLIP, d);
      setStartTime(0);
      setEndTime(clipEnd);
      video.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && !previewing) {
      videoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  const timeToPercent = (t: number) => duration > 0 ? (t / duration) * 100 : 0;
  const percentToTime = (p: number) => (p / 100) * duration;

  const getTrackX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100;
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'bar') => {
    e.preventDefault();
    dragging.current = type;
    dragStartX.current = e.clientX;
    dragStartValues.current = { start: startTime, end: endTime };

    const onMove = (ev: MouseEvent) => {
      const track = trackRef.current;
      if (!track || !dragging.current) return;
      const rect = track.getBoundingClientRect();
      const deltaPct = ((ev.clientX - dragStartX.current) / rect.width) * 100;
      const deltaTime = percentToTime(deltaPct);

      if (dragging.current === 'start') {
        const newStart = Math.max(0, Math.min(dragStartValues.current.start + deltaTime, dragStartValues.current.end - MIN_CLIP));
        setStartTime(newStart);
      } else if (dragging.current === 'end') {
        const newEnd = Math.min(duration, Math.max(dragStartValues.current.end + deltaTime, dragStartValues.current.start + MIN_CLIP));
        // Enforce max clip length
        const newStart = Math.max(dragStartValues.current.start, newEnd - MAX_CLIP);
        setEndTime(newEnd);
        if (newEnd - dragStartValues.current.start > MAX_CLIP) setStartTime(newStart);
      } else if (dragging.current === 'bar') {
        const clipLen = dragStartValues.current.end - dragStartValues.current.start;
        let newStart = dragStartValues.current.start + deltaTime;
        newStart = Math.max(0, Math.min(newStart, duration - clipLen));
        setStartTime(newStart);
        setEndTime(newStart + clipLen);
      }
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent, type: 'start' | 'end' | 'bar') => {
    e.preventDefault();
    dragging.current = type;
    dragStartX.current = e.touches[0].clientX;
    dragStartValues.current = { start: startTime, end: endTime };

    const onMove = (ev: TouchEvent) => {
      const track = trackRef.current;
      if (!track || !dragging.current) return;
      const rect = track.getBoundingClientRect();
      const deltaPct = ((ev.touches[0].clientX - dragStartX.current) / rect.width) * 100;
      const deltaTime = percentToTime(deltaPct);

      if (dragging.current === 'start') {
        const newStart = Math.max(0, Math.min(dragStartValues.current.start + deltaTime, dragStartValues.current.end - MIN_CLIP));
        setStartTime(newStart);
      } else if (dragging.current === 'end') {
        const newEnd = Math.min(duration, Math.max(dragStartValues.current.end + deltaTime, dragStartValues.current.start + MIN_CLIP));
        const newStart = Math.max(dragStartValues.current.start, newEnd - MAX_CLIP);
        setEndTime(newEnd);
        if (newEnd - dragStartValues.current.start > MAX_CLIP) setStartTime(newStart);
      } else if (dragging.current === 'bar') {
        const clipLen = dragStartValues.current.end - dragStartValues.current.start;
        let newStart = dragStartValues.current.start + deltaTime;
        newStart = Math.max(0, Math.min(newStart, duration - clipLen));
        setStartTime(newStart);
        setEndTime(newStart + clipLen);
      }
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const previewClip = () => {
    const video = videoRef.current;
    if (!video || previewing) return;
    setPreviewing(true);
    video.currentTime = startTime;
    video.play();
    previewTimer.current = setTimeout(() => {
      video.pause();
      video.currentTime = startTime;
      setPreviewing(false);
    }, (endTime - startTime) * 1000);
  };

  useEffect(() => () => clearTimeout(previewTimer.current), []);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clipLength = endTime - startTime;
  const startPct = timeToPercent(startTime);
  const endPct = timeToPercent(endTime);

  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
      <div className="bg-hf-card border border-hf-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hf-border">
          <div>
            <h3 className="font-display text-lg font-bold">✂️ Trim Your Teaser</h3>
            <p className="text-xs text-hf-muted mt-0.5">Fans see this clip for free — they pay to unlock the full video</p>
          </div>
          <button onClick={onClose} className="text-hf-muted hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hf-border">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Video */}
          <video ref={videoRef} src={videoUrl} className="w-full rounded-xl max-h-48 object-contain bg-black" muted playsInline />

          {/* Clip info */}
          <div className="flex justify-between text-sm font-mono">
            <span className="text-hf-muted">Clip: <span className="text-hf-orange font-bold">{formatTime(startTime)} → {formatTime(endTime)}</span></span>
            <span className="text-hf-muted">Length: <span className="text-hf-orange font-bold">{clipLength.toFixed(1)}s</span></span>
          </div>

          {/* ── THE TIMELINE ── */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-hf-muted font-mono">
              <span>0:00</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Track */}
            <div
              ref={trackRef}
              className="relative h-10 bg-hf-dark rounded-full border border-hf-border select-none"
              style={{ touchAction: 'none' }}
            >
              {/* Dimmed areas outside clip */}
              <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l-full" style={{ width: `${startPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-black/40 rounded-r-full" style={{ left: `${endPct}%` }} />

              {/* Selected clip bar — drag to move whole clip */}
              <div
                className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
                style={{
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  background: 'linear-gradient(135deg, #CC2400, #FF6B00)',
                  opacity: 0.85,
                }}
                onMouseDown={e => handleMouseDown(e, 'bar')}
                onTouchStart={e => handleTouchStart(e, 'bar')}
              />

              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-10 flex items-center justify-center cursor-ew-resize z-10"
                style={{ left: `${startPct}%` }}
                onMouseDown={e => handleMouseDown(e, 'start')}
                onTouchStart={e => handleTouchStart(e, 'start')}
              >
                <div className="w-4 h-8 bg-white rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-hf-red" />
                  <div className="w-1 h-1 rounded-full bg-hf-red" />
                  <div className="w-1 h-1 rounded-full bg-hf-red" />
                </div>
              </div>

              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-10 flex items-center justify-center cursor-ew-resize z-10"
                style={{ left: `${endPct}%` }}
                onMouseDown={e => handleMouseDown(e, 'end')}
                onTouchStart={e => handleTouchStart(e, 'end')}
              >
                <div className="w-4 h-8 bg-white rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-hf-orange" />
                  <div className="w-1 h-1 rounded-full bg-hf-orange" />
                  <div className="w-1 h-1 rounded-full bg-hf-orange" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-hf-muted text-center">
              Drag handles to resize • Drag bar to move • Min 3s • Max 15s
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={previewClip}
              disabled={previewing || duration === 0}
              className="flex-1 py-3 bg-hf-dark border border-hf-border rounded-xl text-sm font-semibold hover:border-hf-orange transition-all disabled:opacity-40"
            >
              {previewing ? '▶ Playing...' : '▶ Preview Clip'}
            </button>
            <button
              onClick={() => onConfirm(startTime, clipLength)}
              disabled={duration === 0}
              className="flex-1 py-3 bg-gradient-hf text-white font-bold rounded-xl hover:opacity-90 transition-all"
            >
              ✅ Use This Clip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
