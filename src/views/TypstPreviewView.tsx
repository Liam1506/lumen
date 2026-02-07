import React, { useEffect, useRef, useState, useCallback } from "react";
import { $typst } from "@myriaddreamin/typst.ts";
import TypstWorker from "../worker/typst.worker.ts?worker";

interface TypstPreviewViewProps {
  code: string;
}

export const TypstPreviewView: React.FC<TypstPreviewViewProps> = ({ code }) => {
  const [workerReady, setWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVectorData, setLastVectorData] = useState<any>(null); // Store data for resizing

  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 1. Memoized Render Function
  const renderCanvas = useCallback((vectorData: any) => {
    if (!canvasRef.current || !vectorData) return;

    try {
      canvasRef.current.innerHTML = "";
      $typst.canvas(canvasRef.current, {
        vectorData: vectorData,
        // This ensures high-quality rendering based on screen density
        pixelPerPt: window.devicePixelRatio || 1,
      });
    } catch (err) {
      console.error("Render error:", err);
    }
  }, []);

  // 2. Watch for Container Resizes
  useEffect(() => {
    if (!canvasRef.current || !lastVectorData) return;

    const resizeObserver = new ResizeObserver(() => {
      // Re-render the existing data when the div size changes
      renderCanvas(lastVectorData);
    });

    resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, [lastVectorData, renderCanvas]);

  // 3. Initialize Worker
  useEffect(() => {
    let mounted = true;
    const initializeTypst = async () => {
      try {
        await $typst.setRendererInitOptions({
          getModule: () => "/wasm/typst_ts_renderer_bg.wasm",
        });

        workerRef.current = new TypstWorker();
        workerRef.current.onmessage = (e) => {
          if (!mounted) return;

          if (e.data.type === "ready") {
            setWorkerReady(true);
            setError(null);
          }

          if (e.data.vectorData) {
            setLastVectorData(e.data.vectorData); // Save data to state
            renderCanvas(e.data.vectorData); // Render immediately
            setError(null);
          }

          if (e.data.error) setError(e.data.error);
        };
      } catch (err) {
        setError(`Failed to initialize: ${err}`);
      }
    };

    initializeTypst();
    return () => {
      mounted = false;
      workerRef.current?.terminate();
    };
  }, [renderCanvas]);

  // 4. Send updates to worker
  useEffect(() => {
    if (!workerReady || !code) return;
    const timer = setTimeout(() => {
      workerRef.current?.postMessage({ content: code });
    }, 150);
    return () => clearTimeout(timer);
  }, [code, workerReady]);

  return (
    <div className="relative h-full w-full bg-[#f8f9fa] overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div
          ref={canvasRef}
          className="typst-canvas-container shadow-md bg-white min-h-[297mm] w-full max-w-[210mm]"
        />
      </div>
      {/* ... Error & Loading UI ... */}
    </div>
  );
};
export default TypstPreviewView;
