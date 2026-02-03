import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    katex: any;
    renderMathInElement: any;
  }
}

// KaTeX CDN を動的に読み込むフック
const useKaTeX = () => {
  useEffect(() => {
    // 既に読み込み済みならスキップ
    if (window.katex) return;
    
    // CSS読み込み
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    
    // JS読み込み
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.async = true;
    document.head.appendChild(script);
    
    // auto-render extension
    script.onload = () => {
      const autoRender = document.createElement('script');
      autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      autoRender.async = true;
      document.head.appendChild(autoRender);
    };
  }, []);
};

// LaTeX数式をレンダリングするコンポーネント
export default function MathRenderer({ content, className = '' }) {
  const containerRef = useRef(null);
  useKaTeX();
  
  useEffect(() => {
    if (!containerRef.current || !content) return;
    
    const renderMath = () => {
      if (window.katex && window.renderMathInElement) {
        try {
          window.renderMathInElement(containerRef.current, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            errorColor: '#000000'
          });
        } catch (e) {
          console.warn('KaTeX rendering error:', e);
        }
      }
    };
    
    // KaTeXが読み込まれるまで待機
    const checkAndRender = () => {
      if (window.katex && window.renderMathInElement) {
        renderMath();
      } else {
        setTimeout(checkAndRender, 100);
      }
    };
    
    checkAndRender();
  }, [content]);
  
  return (
    <div ref={containerRef} className={`${className} whitespace-pre-wrap`}>
      {content}
    </div>
  );
}
