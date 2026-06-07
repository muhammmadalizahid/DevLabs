'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function SQLEditor({ value, onChange, height = 240, readOnly = false, theme }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Re-measure once mounted to reduce cursor drift issues.
    monaco.editor.remeasureFonts();
    editor.layout();
  }

  useEffect(() => {
    if (!editorRef.current || typeof document === 'undefined' || !document.fonts?.ready) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || !editorRef.current) return;
      monacoRef.current?.editor?.remeasureFonts?.();
      editorRef.current.layout();
    });
    return () => { cancelled = true; };
  }, [theme, height]);

  // Detect system/app theme
  const isDark =
    theme === 'dark' ||
    (typeof window !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark');

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <span>SQL Query</span>
        <span className="badge badge-info">MySQL</span>
      </div>
      <MonacoEditor
        height={height}
        language="sql"
        value={value}
        onChange={onChange}
        onMount={handleMount}
        theme={isDark ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "Consolas, 'Courier New', monospace",
          fontLigatures: false,
          lineNumbers: 'on',
          lineHeight: 22,
          letterSpacing: 0,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
