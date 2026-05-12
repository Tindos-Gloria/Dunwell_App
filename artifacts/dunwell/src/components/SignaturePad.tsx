import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser, PenLine } from "lucide-react";

interface SignaturePadProps {
  onSignature: (dataUrl: string | null) => void;
  label?: string;
}

export const SignaturePad = ({ onSignature, label = "Nurse Signature" }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      if (padRef.current) padRef.current.clear();
    };

    padRef.current = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(249,250,251)",
      penColor: "#1a365d",
      minWidth: 1.5,
      maxWidth: 3,
    });

    padRef.current.addEventListener("afterUpdateStroke", () => {
      const empty = padRef.current?.isEmpty();
      setHasSignature(!empty);
      if (!empty) {
        onSignature(padRef.current?.toDataURL("image/png") ?? null);
      }
    });

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [onSignature]);

  const clear = () => {
    padRef.current?.clear();
    setHasSignature(false);
    onSignature(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <PenLine className="h-4 w-4 text-primary" /> {label}
        </label>
        {hasSignature && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 text-xs text-muted-foreground">
            <Eraser className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>
      <div className="relative rounded-xl border-2 border-dashed border-primary/30 bg-gray-50 overflow-hidden" style={{ height: 120 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">Sign here with mouse or finger</p>
          </div>
        )}
      </div>
    </div>
  );
};
