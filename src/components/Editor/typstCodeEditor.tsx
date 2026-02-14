import React, { Suspense, useMemo, useRef, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { typst } from "codemirror-lang-typst";
import { indentUnit } from "@codemirror/language";
import { githubLight } from "@uiw/codemirror-theme-github";
import { harperLinter } from "./harperLinter";

interface TypstEditorProps {
  value: string;
  onChange: (val: string) => void;
  debounceMs?: number; // Base debounce time
  adaptiveDebounce?: boolean; // Enable smart debouncing
}

const TypstEditor2: React.FC<TypstEditorProps> = ({
  value,
  onChange,
  debounceMs = 300,
  adaptiveDebounce = true,
}) => {
  const debounceTimerRef = useRef<number | null>(null);
  const lastValueRef = useRef(value);
  const lastChangeTimeRef = useRef<number>(0);

  // Calculate adaptive debounce time
  const getAdaptiveDebounce = useCallback(
    (oldValue: string, newValue: string): number => {
      if (!adaptiveDebounce) return debounceMs;

      const diff = Math.abs(newValue.length - oldValue.length);
      const timeSinceLastChange = Date.now() - lastChangeTimeRef.current;

      // Fast typing (< 100ms between changes)
      if (timeSinceLastChange < 100) {
        // User is actively typing, wait longer
        if (diff <= 2) return 500; // Single char typing
        return 400;
      }

      // Slow/careful typing (> 500ms between changes)
      if (timeSinceLastChange > 500) {
        return 200; // Render faster
      }

      // Large paste (> 50 chars at once)
      if (diff > 50) {
        return 150; // Render quickly for paste
      }

      // Check if structural characters were added
      const addedChars = newValue.slice(oldValue.length);
      const hasStructural = /[#=\[\]{}()\n]/.test(addedChars);

      if (hasStructural) {
        return 250; // Slightly faster for structural changes
      }

      // Default for normal typing
      return debounceMs;
    },
    [debounceMs, adaptiveDebounce],
  );

  // Debounced onChange handler with adaptive timing
  const handleChange = useCallback(
    (newValue: string) => {
      const oldValue = lastValueRef.current;

      // Update refs
      lastValueRef.current = newValue;
      const now = Date.now();

      // Calculate adaptive debounce time
      const debounce = getAdaptiveDebounce(oldValue, newValue);

      // Clear existing timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // Log for debugging (remove in production)
      if (adaptiveDebounce) {
        const diff = Math.abs(newValue.length - oldValue.length);
        console.log(
          `Editor: Adaptive debounce ${debounce}ms (diff: ${diff} chars)`,
        );
      }

        console.log("Editor: Debounce complete, triggering onChange");
        onChange(newValue);
        debounceTimerRef.current = null;
  

      lastChangeTimeRef.current = now;
    },
    [onChange, getAdaptiveDebounce, adaptiveDebounce],
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        // Flush pending change on unmount
        if (lastValueRef.current !== value) {
          onChange(lastValueRef.current);
        }
      }
    };
  }, [onChange, value]);

  // Memoize extensions to prevent unnecessary re-configuration
  const extensions = useMemo(
    () => [
      typst(), // Typst syntax highlighting
      indentUnit.of("  "), // 2-space indentation
      EditorView.lineWrapping, // Soft wrap lines
      harperLinter, // Harper grammar and spell checking
    ],
    [],
  );

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <div className="h-full w-full overflow-hidden text-sm border-r border-gray-200">
        <CodeMirror
          value={value}
          height="100%"
          theme={githubLight}
          extensions={extensions}
          onChange={handleChange}
          className="h-full"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            foldGutter: true,
            highlightSelectionMatches: true,
            lintKeymap: true, // Enable lint keyboard shortcuts
          }}
        />
      </div>
    </Suspense>
  );
};

export default TypstEditor2;
