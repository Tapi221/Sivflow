import { useCallback, useLayoutEffect, useState } from "react";
import { canGoToNextCardCarouselItem, canGoToPreviousCardCarouselItem, clampCardCarouselIndex, isNearCardCarouselItem, shouldNotifyCardCarouselIndexChange } from "@/features/review/domain/cardCarouselIndexRules";
import { useCardCarousel3DWebBridge } from "@/features/review/infra/web/useCardCarousel3DWebBridge";