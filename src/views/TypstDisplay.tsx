import { useEffect, useRef, useState } from 'react';
import { createTypstCompiler, createTypstRenderer } from '@myriaddreamin/typst.ts';
import type { TypstCompiler, TypstRenderer } from '@myriaddreamin/typst.ts';
import { COMPILER_WASM_URL, RENDERER_WASM_URL } from '@/connstats';
import { InMemoryAccessModel } from './accessModel';
import { loadFonts, withAccessModel } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';

export default function TypstRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [typstCode, setTypstCode] = useState(`= Hello from Typst!

This is a *bold* statement and this is _italic_.

== A Subsection

Here's a list:
- First item
- Second item
- Third item

And some math: $E = m c^2$

#align(center)[
  #text(20pt)[
    Typst is amazing!
  ]
]`);
  
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  
  const compilerRef = useRef<TypstCompiler | null>(null);
  const rendererRef = useRef<TypstRenderer | null>(null);

  // Initialize compiler and renderer once
  useEffect(() => {
    let mounted = true;

    async function initTypst() {
      try {
        const accessModel = new InMemoryAccessModel('memory');
        console.log("Init renderer")
        const cc = createTypstCompiler();
        const renderer = createTypstRenderer();
        
  await cc.init({
      getModule: () => COMPILER_WASM_URL,
      beforeBuild: [
        // 1. Load Roboto directly via URL (from the .d.mts example)
        loadFonts([
          'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2'
        ]),
        // 2. Properly register your access model
      ]
    });
        await renderer.init({
          getModule: () => RENDERER_WASM_URL
        });
        
        if (mounted) {
          compilerRef.current = cc;
          rendererRef.current = renderer;
          console.log("Is mounted")
        }
        const mainFilePath = '/main.typ';

        const encoder = new TextEncoder();

        const test = `= Hello from Typst!

This is a *bold* statement and this is _italic_.

== A Subsection

`
        cc.addSource(mainFilePath, test);

        console.log("Mapped shadow")
        
        const artifact = await cc.compile({ mainFilePath });
        
        console.log("Compiled")
        
        if (!artifact.result) {
          throw new Error('Compilation failed: no result');
        }

        // Clear previous canvas
        containerRef.current!.innerHTML = '';

        await rendererRef.current!.renderToCanvas({
          container: containerRef.current!,
          pixelPerPt: 3,
          backgroundColor: '#ffffff',
          artifactContent: artifact.result,
          format: "vector"
        });
      } catch (err) {
        console.error('Failed to initialize Typst:', err);
        if (mounted) {
          setError('Failed to initialize Typst: ' + (err as Error).message);
        }
      }
    }

    initTypst();

    return () => {
      mounted = false;
    };
  }, []);

  // Compile and render when code changes
  useEffect(() => {
    if (!compilerRef.current || !rendererRef.current || !containerRef.current) {
      return;
    }

    async function compileAndRender() {
      setIsCompiling(true);
      setError(null);

      try {
        console.log("Start copiling")
        const mainFilePath = '/main.typ';

        const encoder = new TextEncoder();
        compilerRef.current?.mapShadow(mainFilePath, encoder.encode(typstCode));


        
        const artifact = await compilerRef.current!.compile({ mainFilePath });
        
        if (!artifact.result) {
          throw new Error('Compilation failed: no result');
        }

        // Clear previous canvas
        containerRef.current!.innerHTML = '';

        await rendererRef.current!.renderToCanvas({
          container: containerRef.current!,
          pixelPerPt: 3,
          backgroundColor: '#ffffff',
          artifactContent: artifact.result,
          format: "vector"
        });
      } catch (err) {
        console.error('Compilation error:', err);
        setError('Compilation error: ' + (err as Error).message);
      } finally {
        setIsCompiling(false);
      }
    }

    compileAndRender();
  }, [typstCode]);

  return (
    <div style={{ display: 'flex', height: '100vh', gap: '20px', padding: '20px' }}>
      {/* Editor */}

      {/* Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2>Preview</h2>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
          }}
        />
      </div>
    </div>
  );
}