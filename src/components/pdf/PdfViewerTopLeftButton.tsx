const pdfViewerTopLeftButtonStyle = {
  width: "34px",
  height: "34px",
  border: "1px solid rgba(0, 0, 0, 0.07)",
  borderRadius: "999px",
  background:
    "linear-gradient(180deg, #ffffff 0%, #f6f6f6 42%, #ececec 100%)",
  display: "grid",
  placeItems: "center",
  padding: 0,
  appearance: "none" as const,
  cursor: "pointer",
  boxShadow:
    "0 8px 14px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 1px rgba(0, 0, 0, 0.04)",
};

const pdfViewerTopLeftIconStyle = {
  width: "18px",
  height: "18px",
  stroke: "#1E2A44",
  strokeWidth: 2.4,
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  overflow: "visible" as const,
  pointerEvents: "none" as const,
};

export const PdfViewerTopLeftButton = () => {
  return (
    <button
      className="transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
      type="button"
      aria-label="layout"
      style={pdfViewerTopLeftButtonStyle}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        style={pdfViewerTopLeftIconStyle}
      >
        <rect x="3.5" y="4" width="6.5" height="6.5" rx="1.1" />
        <rect x="3.5" y="12.75" width="6.5" height="6.5" rx="1.1" />
        <rect x="3.5" y="21.5" width="6.5" height="6.5" rx="1.1" />
        <rect x="14.5" y="4" width="13.5" height="24" rx="1.4" />
      </svg>
    </button>
  );
};