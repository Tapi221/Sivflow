type Port = {
  signIn: () => Promise<void>; };
type Input = {
  webAuth: Port; desktopAuth: Port; runtimeKind: string; userAgent: string; };



const selectGoogleAuthPort = (input: Input): Port => {
  if (input.runtimeKind === "desktop") return input.desktopAuth;
  if (input.userAgent.includes("Tauri")) return input.desktopAuth;
  return input.webAuth;
};



export { selectGoogleAuthPort };
