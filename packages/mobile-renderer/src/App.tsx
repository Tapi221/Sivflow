import { memo } from "react";



import { Platform, View } from "react-native";



import HandwritingModeScreen from "@mobile-renderer/screens/ipad/handwriting/HandwritingModeScreen";



const App = () => <View style={{ flex: 1 }}>{Platform.OS === "ios" ? <HandwritingModeScreen /> : null}</View>;



const MemoizedApp = memo(App);

export { MemoizedApp as App };
export default MemoizedApp;
