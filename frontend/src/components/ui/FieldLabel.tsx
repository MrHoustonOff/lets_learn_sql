import React from 'react';

export const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean; hint?: string }> = ({ children, required, hint }) => {
  return (
    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-destructive">*</span>}
      {hint && <span className="text-mini text-muted-foreground font-normal">{hint}</span>}
    </label>
  );
};
