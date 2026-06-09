export interface DatabaseSchema {
  tables: TableSchema[];
}

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  foreignKeys: ForeignKeySchema[];
  referencedBy: ReferencedBySchema[];
  sequences: SequenceSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
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
