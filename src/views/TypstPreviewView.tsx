import React, { useEffect, useRef, useState, useCallback } from "react";
import { $typst } from "@myriaddreamin/typst.ts";

interface TypstPreviewViewProps {
  worker: Worker | null;
}

/**
 * Global renderer init guard
 */
let rendererInitialized = false;

export const TypstPreviewView: React.FC<TypstPreviewViewProps> = ({
  worker,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize Typst renderer ONCE
   */
  useEffect(() => {
    if (rendererInitialized) return;

    (async () => {
      try {
        await $typst.setRendererInitOptions({
          getModule: () => "/wasm/typst_ts_renderer_bg.wasm",
        });
        rendererInitialized = true;
      } catch (err) {
        console.error("Typst init failed:", err);
        setError("Failed to initialize Typst renderer");
      }
    })();
  }, []);

  /**
   * Render Typst output
   * – preserves scroll position
   * – stable for large documents
   */
  const render = useCallback(async (vectorData: Uint8Array) => {
    if (!canvasRef.current || !rendererInitialized) return;

    const scrollEl = scrollRef.current;
    const prevScrollTop = scrollEl?.scrollTop ?? 0;

    try {
      // Clone to avoid WASM memory aliasing
      const buffer = new ArrayBuffer(vectorData.byteLength);
      const data = new Uint8Array(buffer);
      data.set(vectorData);

      await $typst.canvas(canvasRef.current, {
        vectorData: data,
        pixelPerPt: 2, // 🔒 MUST be constant
      });

      // 🔒 Restore scroll AFTER layout stabilizes
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = prevScrollTop;
        }
      });

      setError(null);
    } catch (err) {
      console.error("Render error:", err);
      setError("Typst rendering failed");
    }
  }, []);

  /**
   * Listen to worker messages
   */
  useEffect(() => {
    if (!worker) return;

    const onMessage = (e: MessageEvent) => {
      const { type, vectorData, error: workerError } = e.data;

      if (type === "render" && vectorData instanceof Uint8Array) {
        render(vectorData);
      }

      if (type === "error") {
        setError(workerError ?? "Worker error");
      }
    };

    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker, render]);

  return (
    <div
      ref={scrollRef}
      className="h-full w-full bg-slate-100 overflow-auto flex justify-center p-6"
    >
      {error && (
        <div className="fixed top-4 z-50 max-w-xl bg-red-50 border-l-4 border-red-500 p-3 shadow">
          <pre className="text-xs text-red-700 whitespace-pre-wrap">
            {error}
          </pre>
        </div>
      )}

      <div
        ref={canvasRef}
        className="bg-white shadow-xl w-full max-w-[210mm]"
      />
    </div>
  );
};

export default TypstPreviewView;
