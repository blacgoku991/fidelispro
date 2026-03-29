import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
  /** When true, scanner is paused (won't fire scans) — used after a successful scan */
  paused?: boolean;
}

export function QrCameraScanner({ onScan, disabled, paused }: QrCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  const startCamera = async () => {
    if (!containerRef.current) return;
    setError(null);
    processedRef.current = false;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Only fire once — parent must reset paused to allow next scan
          if (processedRef.current) return;
          processedRef.current = true;
          onScan(decodedText);
        },
        () => {} // ignore errors (no QR in frame)
      );

      setActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  // When paused changes back to false, allow scanning again
  useEffect(() => {
    if (!paused) {
      processedRef.current = false;
    }
  }, [paused]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current = null;
    } catch {
      // ignore
    }
    setActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Camera viewport — full width on mobile */}
      <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden bg-secondary/50">
        <div id="qr-reader" ref={containerRef} className="w-full h-full [&_video]:!object-cover [&_video]:!rounded-2xl" />

        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              Activez la caméra pour scanner le QR code de la carte client
            </p>
          </div>
        )}

        {/* Paused overlay */}
        {active && paused && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground">En pause...</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      <Button
        onClick={active ? stopCamera : startCamera}
        disabled={disabled}
        variant={active ? "outline" : "default"}
        className={`rounded-xl gap-2 w-full max-w-[340px] ${!active ? "bg-gradient-primary text-primary-foreground" : ""}`}
      >
        {active ? (
          <>
            <CameraOff className="w-4 h-4" /> Arrêter la caméra
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" /> Activer la caméra
          </>
        )}
      </Button>
    </div>
  );
}
