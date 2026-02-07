import React, { useEffect, useRef, useState, useCallback } from "react";
import { $typst } from "@myriaddreamin/typst.ts";

interface TypstPreviewViewProps {
  worker: Worker | null;
}

// Globale Flag außerhalb der Komponente
let rendererInitialized = false;

export const TypstPreviewView: React.FC<TypstPreviewViewProps> = ({
  worker,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [lastVectorData, setLastVectorData] = useState<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize renderer nur einmal beim ersten Mount
  useEffect(() => {
    const initRenderer = async () => {
      if (rendererInitialized) {
        console.log("Renderer already initialized, skipping");
        return;
      }
      try {
        console.log("Initializing renderer...");
        await $typst.setRendererInitOptions({
          getModule: () => "/wasm/typst_ts_renderer_bg.wasm",
        });
        rendererInitialized = true;
        console.log("Renderer initialized successfully");
      } catch (err) {
        console.error("Renderer initialization error:", err);
        setError("Failed to initialize renderer");
      }
    };
    initRenderer();
  }, []); // Nur einmal beim Mount

  // Memoized Render Function
  const renderCanvas = useCallback(async (vectorData: Uint8Array) => {
    if (!canvasRef.current || !vectorData) return;
    if (!rendererInitialized) {
      console.warn("Renderer not yet initialized, waiting...");
      return;
    }

    try {
      console.log("Rendering canvas with data length:", vectorData.length);
      canvasRef.current.innerHTML = "";

      // CRITICAL: Create completely new buffer to avoid aliasing
      const buffer = new ArrayBuffer(vectorData.byteLength);
      const dataClone = new Uint8Array(buffer);
      dataClone.set(vectorData);

      await $typst.canvas(canvasRef.current, {
        vectorData: dataClone,
        pixelPerPt: window.devicePixelRatio || 1,
      });

      console.log("Render successful");
      setError(null);
    } catch (err) {
      console.error("Render error:", err);
      setError("Rendering failed. Check console for details.");
    }
  }, []);

  // Watch for Container Resizes
  useEffect(() => {
    if (!canvasRef.current || !lastVectorData || !rendererInitialized) return;

    const resizeObserver = new ResizeObserver(() => {
      renderCanvas(lastVectorData);
    });

    resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, [lastVectorData, renderCanvas]);

  // Listen to the Worker
  useEffect(() => {
    if (!worker) return;

    const handleMessage = (e: MessageEvent) => {
      const { type, vectorData, error: workerError } = e.data;

      if (type === "render" && vectorData) {
        console.log("Received vector data, length:", vectorData.length);

        // CRITICAL: Clone the data BEFORE storing in state
        const buffer = new ArrayBuffer(vectorData.byteLength);
        const dataClone = new Uint8Array(buffer);
        dataClone.set(vectorData);

        setLastVectorData(dataClone);
        renderCanvas(dataClone);
      }

      if (type === "error") {
        setError(workerError);
      }
    };

    worker.addEventListener("message", handleMessage);
    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [worker, renderCanvas]);

  return (
    <div className="relative h-full w-full bg-slate-100 overflow-hidden flex flex-col">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-red-50 border-l-4 border-red-500 shadow-md">
          <p className="text-red-700 font-mono text-xs overflow-auto max-h-32">
            {error}
          </p>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div
          ref={canvasRef}
          className="shadow-2xl bg-white min-h-[297mm] w-full max-w-[210mm] transition-all"
        />
      </div>
    </div>
  );
};

export default TypstPreviewView;
