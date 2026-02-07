import React, { Suspense, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { typst } from "codemirror-lang-typst";
import { indentUnit } from "@codemirror/language";
import { githubLight } from "@uiw/codemirror-theme-github";
import { harperLinter } from "./harperLinter";

interface TypstEditorProps {
  value: string;
  onChange: (val: string) => void;
}

const TypstEditor2: React.FC<TypstEditorProps> = ({ value, onChange }) => {
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
          onChange={onChange}
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
