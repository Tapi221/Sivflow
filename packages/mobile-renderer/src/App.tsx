import { memo } from "react";
import { Platform, Text, View } from "react-native";
import HandwritingModeScreen from "./screens/ipad/handwriting/HandwritingModeScreen";

type ScheduleYearContentProps = { onSelectDate: (date: Date) => void; selectedDate: Date; yearDate: Date };
type AppProps = { ScheduleYearComponent?: unknown };

const App = () => <View style={{ flex: 1 }}>{Platform.OS === "ios