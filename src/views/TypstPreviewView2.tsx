import React, { useEffect, useRef, useState, useCallback } from "react";
import { createTypstRenderer, type TypstRenderer } from "@myriaddreamin/typst.ts";
import { RENDERER_WASM_URL } from "@/connstats";

interface TypstPreviewViewProps {
  worker: Worker | null;
}

export const TypstPreviewView2: React.FC<TypstPreviewViewProps> = ({
  worker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const rendererRef = useRef<TypstRenderer | null>(null);
  const [isRendererReady, setIsRendererReady] = useState(false);

  const isRenderingRef = useRef(false);
  const pendingArtifactRef = useRef<Uint8Array | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const localRenderer = createTypstRenderer();
    let isMounted = true;

    (async () => {
      try {
        await localRenderer.init({
          getModule: () => RENDERER_WASM_URL
        });
        
        if (isMounted) {
          rendererRef.current = localRenderer;
          setIsRendererReady(true);
        }
      } catch (err) {
        console.error("Typst init failed:", err);
        if (isMounted) setError("Failed to initialize Typst renderer");
      }
    })();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const doRender = useCallback(async () => {
    if (isRenderingRef.current || !pendingArtifactRef.current) {
      return;
    }

    if (!containerRef.current || !rendererRef.current || !isRendererReady) {
      return;
    }

    isRenderingRef.current = true;
    
    const scrollEl = scrollRef.current;
    const prevScrollTop = scrollEl?.scrollTop ?? 0;

    const artifact = pendingArtifactRef.current;
    pendingArtifactRef.current = null;

    try {
      const clonedData = new Uint8Array(artifact);
      const renderer = rendererRef.current;

      // Use renderSvg to get the SVG string directly
      const svgString = await renderer.renderSvg({
        artifactContent: clonedData,
        format: 'vector',
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = svgString;
      }

      requestAnimationFrame(() => {
        if (scrollEl) scrollEl.scrollTop = prevScrollTop;
      });

      setError(null);
      
    } catch (err) {
      console.error("Render error:", err);
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      isRenderingRef.current = false;

      if (pendingArtifactRef.current) {
        setTimeout(doRender, 30);
      }
    }
  }, [isRendererReady]);

  const queueRender = useCallback((artifact: Uint8Array) => {
    pendingArtifactRef.current = new Uint8Array(artifact);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!isRenderingRef.current) {
      debounceTimerRef.current = window.setTimeout(() => {
        doRender();
      }, 50);
    }
  }, [doRender]);

  useEffect(() => {
    if (!worker) return;

    const onMessage = (e: MessageEvent) => {
      const { type, artifact, error: workerError } = e.data;
      
      if (type === "render") {
        queueRender(artifact);
      }

      if (type === "error") {
        setError(workerError ?? "Worker error");
      }
    };

    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker, queueRender]);

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
        ref={containerRef}
        className="bg-white shadow-xl w-full max-w-[210mm] [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
      />
    </div>
  );
};

export default TypstPreviewView2;