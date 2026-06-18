import React, { useRef, useEffect } from 'react';

export const TextInput: React.FC<{ 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  type?: string;
  multiline?: boolean;
}> = ({ value, onChange, placeholder, type = "text", multiline = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, multiline]);

  const className = "w-full bg-popover border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all placeholder:text-muted-foreground";

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={1}
        className={`${className} resize-none overflow-hidden min-h-[42px]`}
      />
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
};
