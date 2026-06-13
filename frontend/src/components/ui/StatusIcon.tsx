import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const StatusIcon: React.FC<{ passed: boolean; warning?: boolean; size?: number }> = ({ passed, warning = false, size = 16 }) => {
  if (passed) return <CheckCircle2 size={size} className="text-success shrink-0" />;
  if (warning) return <AlertTriangle size={size} className="text-warning shrink-0" />;
  return <XCircle size={size} className="text-destructive shrink-0" />;
};
