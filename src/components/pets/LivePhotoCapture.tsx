"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LivePhotoCaptureProps {
  /** Called after a captured photo is uploaded successfully. */
  onCaptured: (url: string) => void;
  /** If set, shows the existing live photo instead of opening the camera. */
  existingUrl?: string;
  /** Called when user wants to retake an existing photo. */
  onReset?: () => void;
}

type CameraError =
  | { kind: "permission"; message: string }
  | { kind: "no-device"; message: string }
  | { kind: "in-use"; message: string }
  | { kind: "unsupported"; message: string }
  | { kind: "unknown"; message: string };

export function LivePhotoCapture({ onCaptured, existingUrl, onReset }: LivePhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // ── Camera lifecycle ────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setPreviewUrl(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "unsupported",
        message: "Your browser does not support camera access. Try Chrome, Safari, or Firefox.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setError({
          kind: "permission",
          message:
            "Camera access was blocked. Enable camera permissions for this site in your browser settings, then try again.",
        });
      } else if (e.name === "NotFoundError" || e.name === "OverconstrainedError") {
        setError({ kind: "no-device", message: "No camera was found on this device." });
      } else if (e.name === "NotReadableError") {
        setError({
          kind: "in-use",
          message: "Your camera is being used by another app. Close it and try again.",
        });
      } else {
        setError({ kind: "unknown", message: e.message || "Could not start the camera." });
      }
    }
  }, []);

  useEffect(() => {
    if (existingUrl) return;
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture + upload ────────────────────────────────────────────────────────

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streaming) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreviewUrl(dataUrl);
    stopCamera();
  }

  async function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;

    setUploading(true);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setUploading(false);
          setError({ kind: "unknown", message: "Could not encode photo. Try again." });
          return;
        }

        const form = new FormData();
        form.append("file", new File([blob], "live-photo.jpg", { type: "image/jpeg" }));

        const res = await fetch("/api/upload", { method: "POST", body: form });
        setUploading(false);

        if (!res.ok) {
          setError({ kind: "unknown", message: "Upload failed. Try again." });
          return;
        }
        const { url } = await res.json();
        onCaptured(url);
      },
      "image/jpeg",
      0.9
    );
  }

  function retake() {
    setPreviewUrl(null);
    setError(null);
    startCamera();
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (existingUrl) {
    return (
      <div className="rounded-card overflow-hidden border-2 border-sage">
        <div className="aspect-square bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={existingUrl} alt="Live verified" className="h-full w-full object-cover" />
        </div>
        <div className="bg-sage/10 px-4 py-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
            <CameraIcon className="w-4 h-4" />
            Live Verified
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-dark-muted hover:text-terracotta"
            >
              Retake
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-card bg-sage/10 border border-sage/30 px-4 py-3">
        <p className="text-sm text-dark">
          <strong className="font-semibold">We need a live photo to verify your pet is real.</strong>{" "}
          Use your camera — gallery uploads are not accepted for this step.
        </p>
      </div>

      {error && <ErrorPanel error={error} onRetry={startCamera} />}

      {!error && !previewUrl && (
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-card bg-dark">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            {!streaming && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                Starting camera…
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={!streaming}
            className="btn-primary w-full"
          >
            <CameraIcon className="w-5 h-5 mr-2" />
            Capture
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-card border-2 border-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={retake} disabled={uploading} className="btn-secondary">
              Retake
            </button>
            <button type="button" onClick={confirm} disabled={uploading} className="btn-primary">
              {uploading ? "Uploading…" : "Use this photo"}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorPanel({ error, onRetry }: { error: CameraError; onRetry: () => void }) {
  const title =
    error.kind === "permission"
      ? "Camera permission needed"
      : error.kind === "no-device"
      ? "No camera found"
      : error.kind === "in-use"
      ? "Camera unavailable"
      : error.kind === "unsupported"
      ? "Camera not supported"
      : "Something went wrong";

  return (
    <div className="rounded-card border border-terracotta/40 bg-terracotta/5 p-5 text-center">
      <h3 className="font-serif text-lg font-bold text-dark mb-1">{title}</h3>
      <p className="text-sm text-dark-muted mb-4">{error.message}</p>
      {error.kind !== "unsupported" && error.kind !== "no-device" && (
        <button type="button" onClick={onRetry} className="btn-primary">
          Try again
        </button>
      )}
    </div>
  );
}

export function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
