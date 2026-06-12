import { memo } from "react";
import HandwritingModeScreen from "@mobile-renderer/screens/ipad/handwriting/HandwritingModeScreen";
import { Platform, View } from "react-native";



const App = () => <View style={{ flex: 1 }}>{Platform.OS === "ios" ? <HandwritingModeScreen /> : null}</View>;



const MemoizedApp = memo(App);

export default MemoizedApp;
export { MemoizedApp as App };
