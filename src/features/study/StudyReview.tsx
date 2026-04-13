import { StudyReviewDesktop } from "@/features/study/presentation/desktop/StudyReviewDesktop";
import { StudyReviewMobile } from "@/features/study/presentation/mobile/StudyReviewMobile";
import type { StudyReviewProps } from "@/features/study/presentation/shared/studyReviewProps";
import {
  getPresentationTarget,
  type PresentationTarget,
} from "@/platform/presentation/getPresentationTarget";
import { getRuntimeKind } from "@/platform/runtimeKind";

const STUDY_REVIEW_COMPONENTS = {
  desktop: StudyReviewDesktop,
  mobile: StudyReviewMobile,
} satisfies Record<
  PresentationTarget,
  (props: StudyReviewProps) => React.JSX.Element
>;

export const StudyReview = (props: StudyReviewProps) => {
  const presentationTarget = getPresentationTarget({
    runtimeKind: getRuntimeKind(),
  });
  const Component = STUDY_REVIEW_COMPONENTS[presentationTarget];
  return <Component {...props} />;
};
