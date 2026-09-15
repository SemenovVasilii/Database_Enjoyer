import { useEffect, useRef, useState } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/sql/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

(self as typeof self & { MonacoEnvironment?: { getWorker: () => Worker } }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });

monaco.editor.defineTheme('database-enjoyer-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0033FF', fontStyle: 'bold' },
    { token: 'string', foreground: '067647' },
    { token: 'number', foreground: 'B54708' },
    { token: 'comment', foreground: '7A8293', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#101828',
    'editorLineNumber.foreground': '#98A2B2',
    'editor.lineHighlightBackground': '#F7F8FA',
    'editor.selectionBackground': '#DCE5FF',
    'editorCursor.foreground': '#0033FF',
  },
});
monaco.editor.defineTheme('database-enjoyer-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '8EAEFF', fontStyle: 'bold' },
    { token: 'string', foreground: '75D6A6' },
    { token: 'number', foreground: 'FEC84B' },
    { token: 'comment', foreground: '85858D', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#222225',
    'editor.foreground': '#FBFBFC',
    'editorLineNumber.foreground': '#73737B',
    'editor.lineHighlightBackground': '#29292D',
    'editor.selectionBackground': '#344875',
    'editorCursor.foreground': '#6694FF',
  },
});

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: (sql: string) => void;
}

export function SqlEditor({ value, onChange, onRun }: SqlEditorProps) {
  const runRef = useRef(onRun);
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === 'dark'
      ? 'database-enjoyer-dark'
      : 'database-enjoyer-light',
  );

  useEffect(() => {
    runRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    const apply = () =>
      setTheme(
        document.documentElement.dataset.theme === 'dark'
          ? 'database-enjoyer-dark'
          : 'database-enjoyer-light',
      );
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const mount: OnMount = (editor) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model) return;
      const selected = selection ? model.getValueInRange(selection) : '';
      runRef.current(selected.trim() ? selected : model.getValue());
    });
    editor.focus();
  };

  return (
    <Editor
      height="100%"
      language="sql"
      theme={theme}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      onMount={mount}
      loading={<div className="p-5 text-sm text-muted">Загружаем редактор…</div>}
      options={{
        ariaLabel: 'SQL-редактор',
        automaticLayout: true,
        contextmenu: true,
        cursorBlinking: 'smooth',
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
        fontSize: 14,
        fontLigatures: true,
        lineHeight: 22,
        minimap: { enabled: false },
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        stickyScroll: { enabled: false },
        tabSize: 2,
        wordWrap: 'on',
      }}
    />
  );
}
