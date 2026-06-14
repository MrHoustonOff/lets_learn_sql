import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownTextProps {
  text?: string | null;
  inline?: boolean;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, inline = false, className = '' }) => {
  if (!text) return null;

  if (inline) {
    return (
      <span className={className}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: React.Fragment
          }}
        >
          {text}
        </ReactMarkdown>
      </span>
    );
  }

  // Full block-level markdown rendering
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none text-foreground/90 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {text}
      </ReactMarkdown>
    </div>
  );
};
