import React from 'react';

export const SectionCard: React.FC<{ title?: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-mini text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
