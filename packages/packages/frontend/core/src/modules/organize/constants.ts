export const OrganizeSupportType = [
  'folder',
  'doc',
  'collection',
  'tag',
  'file',
] as const;
export type OrganizeSupportTypeUnion =
  | 'folder'
  | 'doc'
  | 'collection'
  | 'tag'
  | 'file';

export const isOrganizeSupportType = (
  type: string
): type is OrganizeSupportTypeUnion =>
  OrganizeSupportType.includes(type as OrganizeSupportTypeUnion);
