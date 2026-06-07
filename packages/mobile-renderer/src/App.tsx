import { type ComponentType, memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import HandwritingModeScreen from "./screens/ipad/handwriting/HandwritingModeScreen";
import TrashScreen from "./screens/TrashScreen";

type