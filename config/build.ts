type BuildImportMetaEnv = ImportMeta["env"] & {
  readonly VITE_BUILD_VERSION?: string;
};

const env = import.meta.env as BuildImportMetaEnv;

export const BUILD_VERSION = env.VITE_BUILD_VERSION ?? import.meta.env.MODE;
