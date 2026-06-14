import React from "react";
import { registerRootComponent } from "expo";
import { App } from "@android-renderer/App";

const AndroidApp = () => React.createElement(App);

registerRootComponent(AndroidApp);
