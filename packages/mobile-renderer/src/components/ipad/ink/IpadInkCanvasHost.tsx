import React, { memo, useCallback } from "react";
import { Platform, requireNativeComponent, StyleSheet, Text, View } from "react-native";
import type { NativeSyntheticEvent, ViewProps } from "react-native";
import type { InkEditTool, InkPoint, InkStroke } from "@core/domain/card/ink/inkDocument";

type NativeInkChangeEvent = { strokes: InkStroke[] };
