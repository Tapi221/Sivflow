const hasOpenModalDialog = () => {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.querySelector("[role=\"dialog\"][data-state=\"open\"]") ||
    document.querySelector("[role=\"dialog\"][aria-modal=\"true\"]") ||
    document.querySelector("[role=\"alertdialog\"][data-state=\"open\"]") ||
    document.querySelector("[role=\"alertdialog\"][aria-modal=\"true\"]"),
  );
};



export { hasOpenModalDialog };
