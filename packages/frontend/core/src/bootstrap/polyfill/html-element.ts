if (typeof globalThis.HTMLElement === 'undefined') {
  (globalThis as any).HTMLElement = class HTMLElement {};
}

if (typeof globalThis.document === 'undefined') {
  const createNode = () => {
    const node: any = {
      style: {},
      childNodes: [],
      nodeType: 1,
      parentNode: null,
      ownerDocument: null,
      appendChild(child: any) {
        child.parentNode = node;
        node.childNodes.push(child);
        return child;
      },
      cloneNode() {
        return createNode();
      },
      insertBefore(child: any, referenceNode?: any) {
        child.parentNode = node;
        const index = referenceNode ? node.childNodes.indexOf(referenceNode) : -1;
        if (index === -1) {
          node.childNodes.push(child);
        } else {
          node.childNodes.splice(index, 0, child);
        }
        return child;
      },
      remove() {
        node.parentNode?.removeChild?.(node);
      },
      removeChild(child: any) {
        const index = node.childNodes.indexOf(child);
        if (index !== -1) {
          node.childNodes.splice(index, 1);
        }
        child.parentNode = null;
        return child;
      },
      setAttribute() {},
      removeAttribute() {},
      addEventListener() {},
      removeEventListener() {},
    };

    return node;
  };

  const documentStub: any = {
    addEventListener() {},
    removeEventListener() {},
    createComment(data = '') {
      return {
        ...createNode(),
        data,
        nodeType: 8,
        ownerDocument: documentStub,
      };
    },
    createElement(tagName = 'div') {
      const element = {
        ...createNode(),
        tagName: tagName.toUpperCase(),
        content: createNode(),
        ownerDocument: documentStub,
      };
      element.content.ownerDocument = documentStub;
      return element;
    },
    createTextNode(data = '') {
      return {
        ...createNode(),
        data,
        nodeType: 3,
        ownerDocument: documentStub,
      };
    },
    createTreeWalker(root: any) {
      return {
        currentNode: root,
        nextNode: () => null,
      };
    },
    importNode(node: any) {
      return typeof node?.cloneNode === 'function' ? node.cloneNode(true) : node;
    },
  };

  documentStub.documentElement = documentStub.createElement('html');
  documentStub.body = documentStub.createElement('body');

  (globalThis as any).document = documentStub;
}
