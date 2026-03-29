import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrCameraScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

export function QrCameraScanner({ onScan, disabled }: QrCameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef(false);

  const startCamera = async () => {
    if (!containerRef.current) return;
    setError(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (cooldownRef.current || decodedText === lastScannedRef.current) return;
          lastScannedRef.current = decodedText;
          cooldownRef.current = true;
          onScan(decodedText);
          // Cooldown to avoid double scans
          setTimeout(() => {
            cooldownRef.current = false;
            lastScannedRef.current = "";
          }, 3000);
        },
        () => {} // ignore errors (no QR in frame)
      );

      setActive(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current = null;
    } catch {
      // ignore
    }
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Camera viewport */}
      <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-secondary/50">
        <div id="qr-reader" ref={containerRef} className="w-full h-full" />

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
      </div>

      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}

      <Button
        onClick={active ? stopCamera : startCamera}
        disabled={disabled}
        variant={active ? "outline" : "default"}
        className={`rounded-xl gap-2 w-full max-w-[280px] ${!active ? "bg-gradient-primary text-primary-foreground" : ""}`}
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
