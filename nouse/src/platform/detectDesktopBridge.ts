import * as detector from "@platform/detectDesktopBridge";



const hasDesktopBridge = detector.hasDesktopBridge;
const hasDesktopRuntime = detector.hasDesktopRuntime;
const hasWindowDesktopBridge = detector.hasWindowDesktopBridge;



export { hasDesktopBridge, hasDesktopRuntime, hasWindowDesktopBridge };
