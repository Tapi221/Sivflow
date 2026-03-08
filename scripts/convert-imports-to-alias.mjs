import path from "node:path";
import fg from "fast-glob";
import { Project } from "ts-morph";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const project = new Project({
  tsConfigFilePath: path.join(projectRoot, "tsconfig.app.json"),
});

const files = fg.sync(["src/**/*.{ts,tsx,js,jsx}"], {
  cwd: projectRoot,
  absolute: true,
  ignore: ["**/*.d.ts"],
});

for (const filePath of files) {
  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);

  let changed = false;

  for (const decl of sourceFile.getImportDeclarations()) {
    const spec = decl.getModuleSpecifierValue();
    if (!spec.startsWith("../")) continue;

    const importerDir = path.dirname(filePath);
    const resolved = path.resolve(importerDir, spec);

    if (!resolved.startsWith(srcRoot)) continue;

    const relativeFromSrc = path.relative(srcRoot, resolved).replace(/\\/g, "/");
    decl.setModuleSpecifier(`@/${relativeFromSrc}`);
    changed = true;
  }

  for (const decl of sourceFile.getExportDeclarations()) {
    const spec = decl.getModuleSpecifierValue();
    if (!spec || !spec.startsWith("../")) continue;

    const importerDir = path.dirname(filePath);
    const resolved = path.resolve(importerDir, spec);

    if (!resolved.startsWith(srcRoot)) continue;

    const relativeFromSrc = path.relative(srcRoot, resolved).replace(/\\/g, "/");
    decl.setModuleSpecifier(`@/${relativeFromSrc}`);
    changed = true;
  }

  if (changed) {
    sourceFile.organizeImports();
  }
}

await project.save();
console.log("Done: converted ../ imports to @/ aliases");
