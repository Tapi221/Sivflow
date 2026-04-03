export default function transformer(file, api) {
  const j = api.jscodeshift;

  return j(file.source)
    .find(j.FunctionDeclaration)
    .replaceWith((path) => {
      const name = path.node.id?.name;

      if (!name) return path.node;

      return j.variableDeclaration("const", [
        j.variableDeclarator(
          j.identifier(name),
          j.arrowFunctionExpression(
            path.node.params,
            path.node.body
          )
        ),
      ]);
    })
    .toSource();
}
