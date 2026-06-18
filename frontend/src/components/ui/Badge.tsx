import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'dashed';
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '', variant = 'default' }) => {
  const baseClasses = "text-xs px-2 py-0.5 rounded-md font-medium truncate inline-flex items-center justify-center";
  
  let variantClasses = "";
  let style: React.CSSProperties | undefined = undefined;

  if (variant === 'default') {
    style = {
      background: `hsl(var(--badge-bg) / var(--badge-bg-opacity))`,
      color: `hsl(var(--badge-fg))`,
    };
  } else if (variant === 'outline') {
    variantClasses = "border border-glass-border bg-glass text-foreground";
  } else if (variant === 'dashed') {
    variantClasses = "border border-dashed border-glass-border text-muted-foreground/50 bg-glass/20";
  }

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};
