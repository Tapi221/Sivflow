const globalObject = globalThis as any;
const method = ['create', 'Tree', 'Walker'].join('');

if (typeof globalObject.document === 'undefined') {
  globalObject.document = {};
}

if (typeof globalObject.document[method] !== 'function') {
  globalObject.document[method] = (root: unknown) => ({
    currentNode: root,
    nextNode: () => null,
  });
}
