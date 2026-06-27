const globalObject = globalThis as any;

if (typeof globalObject.HTMLElement === 'undefined') {
  globalObject.HTMLElement = class HTMLElement {};
}

if (typeof globalObject.Element === 'undefined') {
  globalObject.Element = globalObject.HTMLElement;
}

if (typeof globalObject.document === 'undefined') {
  const createNode = (nodeType = 1) => {
    const node: any = {
      style: {},
      childNodes: [],
      nodeType,
      parentNode: null,
      ownerDocument: null,
      appendChild(item: any) {
        item.parentNode = node;
        node.childNodes.push(item);
        return item;
      },
      cloneNode(copyChildren = false) {
        const clone = createNode(node.nodeType);
        clone.data = node.data;
        clone.tagName = node.tagName;
        clone.ownerDocument = node.ownerDocument;
        clone.content = node.content ? createNode(11) : undefined;
        clone.style = { ...node.style };

        if (copyChildren) {
          node.childNodes.forEach((item: any) => {
            clone.appendChild(
              typeof item?.cloneNode === 'function' ? item.cloneNode(true) : item
            );
          });
        }

        return clone;
      },
      insertBefore(item: any, referenceNode?: any) {
        item.parentNode = node;
        const index = referenceNode ? node.childNodes.indexOf(item) : -1;
        if (index === -1) {
          node.childNodes.push(item);
        } else {
          node.childNodes.splice(index, 0, item);
        }
        return item;
      },
      remove() {
        node.parentNode?.removeChild?.(node);
      },
      removeChild(item: any) {
        const index = node.childNodes.indexOf(item);
        if (index !== -1) {
          node.childNodes.splice(index, 1);
        }
        item.parentNode = null;
        return item;
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
      const comment = createNode(8);
      comment.data = data;
      comment.ownerDocument = documentStub;
      return comment;
    },
    createElement(tagName = 'div') {
      const element = createNode(1);
      element.tagName = tagName.toUpperCase();
      element.content = createNode(11);
      element.ownerDocument = documentStub;
      element.content.ownerDocument = documentStub;
      return element;
    },
    createTextNode(data = '') {
      const text = createNode(3);
      text.data = data;
      text.ownerDocument = documentStub;
      return text;
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

  globalObject.document = documentStub;
}
