import semver from 'semver';

function normalizeComparableVersion(version: string): string | null {
  return semver.valid(version.trim(), {
    loose: true,
  });
}

export function hasNewerVersion(
  currentVersion: string,
  nextVersion: string
): boolean {
  const current = normalizeComparableVersion(currentVersion);
  const next = normalizeComparableVersion(nextVersion);

  if (!current || !next) {
    return currentVersion.trim() !== nextVersion.trim();
  }

  return semver.gt(next, current, {
    loose: true,
  });
}
