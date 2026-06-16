import React, { useState, useRef, useEffect } from 'react';
import { AlignLeft, SplitSquareHorizontal, Eye, Bold, Italic, Strikethrough, Underline, Code } from 'lucide-react';
import { MarkdownText } from './MarkdownText';

const MD_SHORTCUTS = [
  { icon: Bold, prefix: "**", suffix: "**", defaultText: "жирный", title: "Жирный" },
  { icon: Italic, prefix: "*", suffix: "*", defaultText: "курсив", title: "Курсив" },
  { icon: Strikethrough, prefix: "~~", suffix: "~~", defaultText: "зачеркнутый", title: "Зачеркнутый" },
  { icon: Underline, prefix: "<u>", suffix: "</u>", defaultText: "подчеркнутый", title: "Подчеркнутый" },
  { icon: Code, prefix: "`", suffix: "`", defaultText: "код", title: "Код" },
];

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
  autoPreviewOnBlur?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  minHeight = 220,
  autoPreviewOnBlur = false
}) => {
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (prefix: string, suffix: string, defaultText: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const content = selected || defaultText;
    const next = value.slice(0, start) + prefix + content + suffix + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + content.length);
    }, 0);
  };

  const handleContainerClick = () => {
    if (autoPreviewOnBlur && !isFocused) {
      setIsFocused(true);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const currentView = (autoPreviewOnBlur && !isFocused && value) ? "preview" : view;

  return (
    <div 
      className={`border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-primary transition-all ${autoPreviewOnBlur && !isFocused ? 'cursor-pointer hover:border-primary/50' : ''}`}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      onClick={handleContainerClick}
    >
      {/* Toolbar */}
      {(!autoPreviewOnBlur || isFocused || !value) && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-secondary/40 flex-wrap">
          {MD_SHORTCUTS.map((s, i) => (
            <button
              key={i}
              type="button"
              title={s.title}
              onClick={() => insertSnippet(s.prefix, s.suffix, s.defaultText)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <s.icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <div className="ml-auto flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {[
              { id: "edit" as const, icon: AlignLeft, label: "Редактор" },
              { id: "split" as const, icon: SplitSquareHorizontal, label: "Разделить" },
              { id: "preview" as const, icon: Eye, label: "Превью" },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); setView(m.id); }}
                title={m.label}
                className={`p-1.5 rounded-md transition-colors ${
                  view === m.id ? "bg-popover text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex" style={{ minHeight }}>
        {(currentView === "edit" || currentView === "split") && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={`flex-1 px-4 py-3 text-sm font-mono leading-relaxed bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground ${
              currentView === "split" ? "border-r border-border" : ""
            }`}
            style={{ minHeight }}
          />
        )}
        {(currentView === "preview" || currentView === "split") && (
          <div className="flex-1 px-4 py-3 overflow-auto">
             {value ? (
               <MarkdownText text={value} />
             ) : (
               <p className="text-sm text-muted-foreground italic">Превью появится здесь...</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
