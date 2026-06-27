import { memo } from "react";
import { View } from "react-native";

const styles = {
  root: {
    flex: 1,
  },
};

const AppComponent = () => <View style={styles.root} />;

const App = memo(AppComponent);
App.displayName = "App";

export { App };
