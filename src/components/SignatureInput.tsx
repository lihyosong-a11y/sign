import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Upload } from "lucide-react";

interface SignatureInputProps {
  value?: string;
  onChange: (signatureDataUrl: string | undefined) => void;
  compact?: boolean;
}

const canvasWidth = 640;
const canvasHeight = 220;

export function SignatureInput({ value, onChange, compact = false }: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [preview, setPreview] = useState(value);

  useEffect(() => {
    setPreview(value);
    drawImageToCanvas(value);
  }, [value]);

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#111827";
    return context;
  };

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvasWidth,
      y: ((event.clientY - rect.top) / rect.height) * canvasHeight,
    };
  };

  const drawImageToCanvas = (dataUrl?: string) => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!dataUrl) return;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasWidth, canvasHeight);

      const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (canvasWidth - width) / 2, (canvasHeight - height) / 2, width, height);
    };
    image.src = dataUrl;
  };

  const commitCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    setPreview(dataUrl);
    onChange(dataUrl);
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = getContext();
    if (!context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = getContext();
    if (!context) return;

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    commitCanvas();
  };

  const handleClear = () => {
    const context = getContext();
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    setPreview(undefined);
    onChange(undefined);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      onChange(dataUrl);
      drawImageToCanvas(dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <PenLine size={18} aria-hidden="true" />
          서명
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary min-h-9 cursor-pointer px-3 py-1.5">
            <Upload size={16} aria-hidden="true" />
            이미지 업로드
            <input className="sr-only" type="file" accept="image/*" onChange={handleUpload} />
          </label>
          <button className="btn-secondary min-h-9 px-3 py-1.5" type="button" onClick={handleClear}>
            <Eraser size={16} aria-hidden="true" />
            지우기
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className={`w-full touch-none rounded-md border border-ink-200 bg-white ${compact ? "h-32" : "h-44"}`}
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drawingRef.current = false;
        }}
      />

      {preview ? (
        <div className="rounded-md border border-school-100 bg-school-50 px-3 py-2 text-sm font-medium text-school-700">
          서명이 입력되었습니다.
        </div>
      ) : null}
    </div>
  );
}
