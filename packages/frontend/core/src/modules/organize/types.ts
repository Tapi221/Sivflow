export interface NodeInfo {
  id: string;
  parentId: string | null;
  type: 'folder' | 'doc' | 'tag' | 'collection' | 'file';
  data: string;
  index: string;
}

export interface FileNodeMetadata {
  sourceId: string;
  name: string;
  size: number;
  type: string;
}
