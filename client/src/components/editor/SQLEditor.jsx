import { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'

const SAMPLE_QUERIES = [
    `-- Sample: Subquery that can be unnested
SELECT * FROM orders
WHERE user_id IN (
  SELECT id FROM users
  WHERE country = 'IN' AND active = true
)
ORDER BY created_at DESC;`,

    `-- Sample: Missing indexes + SELECT *
SELECT * FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND p.category = 'electronics';`,

    `-- Sample: NOT IN subquery (NULL-unsafe)
SELECT id, name FROM users
WHERE id NOT IN (
  SELECT user_id FROM banned_users
  WHERE reason = 'fraud'
);`,
]

export default function SQLEditor({ value, onChange, onAnalyze, loading, dialect, onDialectChange }) {
    const editorRef = useRef(null)

    const handleMount = (editor, monaco) => {
        editorRef.current = editor

        // Define QueryX dark theme
        monaco.editor.defineTheme('queryx-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword.sql', foreground: 'C8F135', fontStyle: 'bold' },
                { token: 'string.sql', foreground: '38BDF8' },
                { token: 'number', foreground: 'FF5C35' },
                { token: 'comment', foreground: '4A5568', fontStyle: 'italic' },
                { token: 'operator.sql', foreground: '8B5CF6' },
                { token: 'identifier', foreground: 'E4E6E9' },
                { token: 'delimiter.sql', foreground: '6B7785' },
            ],
            colors: {
                'editor.background': '#0D0F12',
                'editor.foreground': '#E4E6E9',
                'editor.lineHighlightBackground': '#C8F1350A',
                'editor.selectionBackground': '#C8F13530',
                'editorCursor.foreground': '#C8F135',
                'editorLineNumber.foreground': '#2D3748',
                'editorLineNumber.activeForeground': '#C8F13580',
                'editor.inactiveSelectionBackground': '#C8F13518',
                'editorIndentGuide.background': '#1A202C',
                'editorWidget.background': '#111418',
                'editorWidget.border': '#C8F13520',
                'list.hoverBackground': '#C8F13510',
                'list.focusBackground': '#C8F13520',
                'editorSuggestWidget.background': '#111418',
                'editorSuggestWidget.border': '#C8F13520',
                'editorSuggestWidget.selectedBackground': '#C8F13518',
                'scrollbar.shadow': '#00000000',
                'scrollbarSlider.background': '#2D374860',
                'scrollbarSlider.hoverBackground': '#C8F13540',
            },
        })
        monaco.editor.setTheme('queryx-dark')

        // Add keyboard shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onAnalyze()
        })
    }

    const loadSample = () => {
        const sample = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)]
        onChange(sample)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-800/60">
                <div className="flex items-center gap-3">
                    {/* Dialect selector */}
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-ink-800/60">
                        {['postgresql', 'mysql'].map(d => (
                            <button key={d}
                                onClick={() => onDialectChange(d)}
                                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-200 ${dialect === d
                                        ? 'bg-acid text-ink-900 font-500'
                                        : 'text-ink-400 hover:text-ink-200'
                                    }`}>
                                {d}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-4 bg-ink-700" />

                    <button onClick={loadSample}
                        className="text-xs text-ink-400 hover:text-acid transition-colors font-mono flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        sample query
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-500 font-mono hidden sm:block">
                        ⌘ + Enter to analyze
                    </span>
                    <button
                        onClick={onAnalyze}
                        disabled={loading || !value?.trim()}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-display font-600 transition-all duration-200 active:scale-[0.97] ${loading || !value?.trim()
                                ? 'bg-ink-800 text-ink-500 cursor-not-allowed'
                                : 'bg-acid text-ink-900 hover:bg-acid-300 animate-pulse-acid'
                            }`}>
                        {loading ? (
                            <>
                                <span className="w-3 h-3 border border-ink-600 border-t-acid rounded-full animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Analyze
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Monaco editor */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    language="sql"
                    value={value}
                    onChange={onChange}
                    onMount={handleMount}
                    options={{
                        fontSize: 13,
                        fontFamily: '"JetBrains Mono", monospace',
                        fontLigatures: true,
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        padding: { top: 16, bottom: 16 },
                        renderLineHighlight: 'line',
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        bracketPairColorization: { enabled: true },
                        formatOnPaste: true,
                        tabSize: 2,
                        suggest: {
                            showKeywords: true,
                            showSnippets: true,
                        },
                    }}
                />

                {/* Empty state hint */}
                {!value && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <div className="text-4xl mb-3 opacity-20">⚡</div>
                            <p className="text-ink-500 text-sm font-mono">paste your SQL or load a sample</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}