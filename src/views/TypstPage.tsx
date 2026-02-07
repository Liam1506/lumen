import React, { useEffect, useRef, useState } from "react";
import { $typst } from "@myriaddreamin/typst.ts";

interface PageProps {
  vectorData: Uint8Array;
}

export const TypstPage: React.FC<PageProps> = ({ vectorData }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && !rendered) {
          const buffer = new ArrayBuffer(vectorData.byteLength);
          const clone = new Uint8Array(buffer);
          clone.set(vectorData);

          await $typst.canvas(el, {
            vectorData: clone,
            pixelPerPt: window.devicePixelRatio || 1,
          });

          setRendered(true);
        }

        if (!entry.isIntersecting && rendered) {
          // optional memory cleanup
          el.innerHTML = "";
          setRendered(false);
        }
      },
      {
        rootMargin: "300px", // preload before visible
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [vectorData, rendered]);

  return (
    <div className="w-full flex justify-center py-6">
      <div ref={ref} className="bg-white shadow-xl w-[210mm] min-h-[297mm]" />
    </div>
  );
};
