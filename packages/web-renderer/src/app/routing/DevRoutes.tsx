import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import { DEV_MODE } from "@/utils/envGuards";

const CodeBlockVisualTest = DEV_MODE
  ? lazy(() => import("@/routes/CodeBlockVisualTest"))
  : null;
const CardLayoutConsistencyTest = DEV_MODE
  ? lazy(() => import("@/routes/CardLayoutConsistencyTest"))
  : null;
const BlockNoteSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/blocknote").then(({ BlockNoteSandboxPage }) => ({
        default: BlockNoteSandboxPage,
      })),
    )
  : null;
const KnowledgeSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/logseq").then(({ LogseqSandboxPage }) => ({
        default: LogseqSandboxPage,
      })),
    )
  : null;

const withDevRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};

export const getDevStandaloneRouteElement = (
  isTestBypass: boolean,
): ReactNode | null => {
  if (
    CodeBlockVisualTest &&
    isTestBypass &&
    window.location.pathname === "/codeblock-visual-test"
  ) {
    return withDevRouteFallback(<CodeBlockVisualTest />);
  }

  return null;
};

export const getDevRouteElements = () => {
  return (
    <>
      {CodeBlockVisualTest ? (
        <Route
          path="codeblock-visual-test"
          element={withDevRouteFallback(<CodeBlockVisualTest />)}
        />
      ) : null}

      {CardLayoutConsistencyTest ? (
        <Route
          path="card-layout-test"
          element={withDevRouteFallback(<CardLayoutConsistencyTest />)}
        />
      ) : null}

      {BlockNoteSandboxPage ? (
        <Route
          path="sandbox/blocknote/*"
          element={withDevRouteFallback(<BlockNoteSandboxPage />)}
        />
      ) : null}

      {KnowledgeSandboxPage ? (
        <Route
          path="sandbox/logseq/*"
          element={withDevRouteFallback(<KnowledgeSandboxPage />)}
        />
      ) : null}
    </>
  );
};
