export const findNodeById = (node: any, id: string): any => {
  if (node.node_id === id) return node;
  if (node.Plans) {
    for (const child of node.Plans) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
};

// Хелпер для цвета в зависимости от стоимости
export const getCostColor = (pct: number) => {
  if (pct > 60) return 'bg-destructive';
  if (pct > 20) return 'bg-warning';
  return 'bg-emerald-500';
};

// Хелпер для уровня стоимости
export const getCostLevel = (pct: number): 'bad' | 'warning' | 'good' => {
  if (pct > 60) return 'bad';
  if (pct > 20) return 'warning';
  return 'good';
};
