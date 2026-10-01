export type Id = string | number;

export type ResourceKey = 'subjects' | 'faculty' | 'classrooms' | 'student-groups' | 'time-slots';

export type RecordValue = string | number | boolean | null | undefined;
export type DataRecord = Record<string, RecordValue> & { id: Id };

export type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'select' | 'checkbox' | 'time';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type ResourceConfig = {
  key: ResourceKey;
  title: string;
  singular: string;
  description: string;
  icon: string;
  fields: FieldConfig[];
  columns: { key: string; label: string; mono?: boolean }[];
  filters?: { key: string; label: string; options?: { value: string; label: string }[] }[];
};

export type AssignmentRecord = DataRecord & {
  subject?: DataRecord;
  faculty?: DataRecord;
  group?: DataRecord;
};