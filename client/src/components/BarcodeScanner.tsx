import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/**
 * BarcodeScanner — scans via the device camera using the native BarcodeDetector
 * API (Chromium/Edge) with a graceful fallback to a manual / HID-scanner input.
 * No external dependencies. When a barcode is detected (or typed + Enter), the
 * `onChange` callback fires with the value.
 */
export function BarcodeScanner({
  value,
  onChange,
  placeholder = "امسح الباركود أو أدخله يدوياً",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const start = async () => {
    setError(null);
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      setError(
        "متصفحك لا يدعم المسح بالكاميرا — استخدم الإدخال اليدوي (أو ماسح الباركود الذي يكتب تلقائياً)."
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const detector = new BD();
      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(() => void tick());
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            onChange(barcodes[0].rawValue);
            stop();
            return;
          }
        } catch {
          /* ignore frame errors */
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch (e: any) {
      setError("تعذر الوصول للكاميرا: " + (e?.message || e));
      setScanning(false);
    }
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && value.trim()) {
              onChange(value.trim());
            }
          }}
        />
        {!scanning ? (
          <button
            type="button"
            onClick={start}
            className="h-9 px-3 rounded-lg bg-ink text-white text-xs flex items-center gap-1.5 hover:bg-ink-deep"
          >
            <Camera className="w-4 h-4" /> كاميرا
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="h-9 px-3 rounded-lg bg-rose-600 text-white text-xs flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> إيقاف
          </button>
        )}
      </div>
      {scanning && (
        <video
          ref={videoRef}
          className="w-full h-48 rounded-lg bg-black object-cover"
          muted
          playsInline
        />
      )}
      {error && <p className="text-[11px] text-amber-600">{error}</p>}
    </div>
  );
}
