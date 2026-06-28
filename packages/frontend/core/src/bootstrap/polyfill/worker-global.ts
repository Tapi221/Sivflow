const globalObject = globalThis as any;

if (typeof globalObject.window === 'undefined') {
  globalObject.window = globalObject;
}

if (typeof globalObject.self === 'undefined') {
  globalObject.self = globalObject;
}

export {};
