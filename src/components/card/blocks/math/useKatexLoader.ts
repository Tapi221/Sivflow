import { useEffect } from "react";



type WindowWithKatex = Window & {
  katex?: unknown;
};



const useKatexLoader = () => {
  useEffect(() => {
    if ((window as WindowWithKatex).katex) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      const autoRender = document.createElement("script");
      autoRender.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js";
      autoRender.async = true;
      document.head.appendChild(autoRender);
    };
  }, []);
};



export { useKatexLoader };
