const hardReloadOnce = (key: string) => {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, "1");
  window.location.reload();
};



export { hardReloadOnce };
