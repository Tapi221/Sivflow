export const EXPLORER_ROW_BASE_CLASS_NAME =
  'group flex items-center h-8 min-h-0 box-border pr-2 py-0 relative w-full text-left rounded-md overflow-hidden transition-colors';

export const getExplorerRowStyle = (depth: number) => ({
  paddingLeft: `${depth * 12 + 4}px`,
  height: 32,
  minHeight: 32,
  boxSizing: 'border-box' as const,
});
