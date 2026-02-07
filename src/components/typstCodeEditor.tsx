import React, { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { typst } from "codemirror-lang-typst";
import { indentUnit } from "@codemirror/language";
import { githubLight } from "@uiw/codemirror-theme-github";

// Define props to receive value and change handler from App
interface TypstEditorProps {
  value: string;
  onChange: (val: string) => void;
}

const TypstEditor2: React.FC<TypstEditorProps> = ({ value, onChange }) => {
  const extensions = useMemo(() => [typst(), indentUnit.of("  ")], []);

  return (
    <CodeMirror
      value={value}
      height="100%"
      className="h-full text-base"
      theme={githubLight}
      extensions={[extensions, EditorView.lineWrapping]}
      // Simplified: Just pass the new string up
      onChange={(val) => onChange(val)}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        bracketMatching: true,
        indentOnInput: true,
        autocompletion: true,
      }}
    />
  );
};

export default TypstEditor2;
