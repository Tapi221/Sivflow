/** @type {import('.')} */
let binding;

const nativeCandidates = [
  './server-native.node',
  process.arch === 'arm64'
    ? './server-native.arm64.node'
    : process.arch === 'arm'
      ? './server-native.armv7.node'
      : './server-native.x64.node',
];

let missingNativeError;

for (const candidate of nativeCandidates) {
  try {
    binding = require(candidate);
    break;
  } catch (error) {
    const isMissingCandidate =
      error &&
      error.code === 'MODULE_NOT_FOUND' &&
      typeof error.message === 'string' &&
      (error.message.includes(candidate) ||
        error.message.includes(candidate.replace('./', '')));

    if (!isMissingCandidate) {
      throw error;
    }

    missingNativeError = error;
  }
}

if (!binding) {
  const createMissingNativeError = () => {
    const error = new Error(
      '@affine/server-native のネイティブバイナリが見つかりません。' +
        '必要な場合は npm --workspace @affine/server-native run build を実行してください。'
    );
    error.cause = missingNativeError;
    return error;
  };

  binding = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') {
          return undefined;
        }

        if (property === '__missingNative') {
          return true;
        }

        if (property === '__missingNativeError') {
          return createMissingNativeError();
        }

        return () => {
          throw createMissingNativeError();
        };
      },
    }
  );
}

module.exports = binding;
