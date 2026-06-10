export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface TableSchema {
  name: string;
  schema: string;
  rowCount?: number;
  sizeBytes?: number;
  description?: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
  referencedBy: ReferencedBySchema[];
  sequences: SequenceSchema[];
  checkConstraints?: CheckConstraintSchema[];
  triggers?: TriggerSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  description?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
}

export interface IndexSchema {
  name: string;
  definition: string;
  isPrimary: boolean;
  isUnique: boolean;
}

export interface ForeignKeySchema {
  name: string;
  column: string;
  targetSchema?: string;
  targetTable: string;
  targetColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface ReferencedBySchema {
  table: string;
  column: string;
  constraint: string;
}

export interface SequenceSchema {
  name: string;
  current: number | null;
}

export interface CheckConstraintSchema {
  name: string;
  definition: string;
}

export interface TriggerSchema {
  name: string;
  definition: string;
}
