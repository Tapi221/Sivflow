import { memo } from "react";
import { View } from "react-native";

const styles = {
  root: {
    flex: 1,
  },
};

const App = () => <View style={styles.root} />;

const MemoizedApp = memo(App);
MemoizedApp.displayName = "App";
export { MemoizedApp as App };
