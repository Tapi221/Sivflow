/**
 * Legacy explorer DnD guard.
 *
 * The old tree explorer implementation was removed, but FolderTreeWithCards
 * still imports this helper from the legacy Arborist path.
 *
 * Return true to disable legacy drops safely.
 */
const shouldDisableExplorerDrop = (..._args: unknown[]): boolean => true;



export { shouldDisableExplorerDrop };
