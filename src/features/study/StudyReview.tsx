import { StudyReviewDesktop } from "@/features/study/presentation/desktop/StudyReviewDesktop";
import { StudyReviewMobile } from "@/features/study/presentation/mobile/StudyReviewMobile";
import type { StudyReviewProps } from "@/features/study/presentation/shared/studyReviewProps";
import type { PresentationTarget } from "@/platform/presentation/getPresentationTarget";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";



const STUDY_REVIEW_COMPONENTS = {
  desktop: StudyReviewDesktop,
  mobile: StudyReviewMobile,
} satisfies Record<
  PresentationTarget,
  (props: StudyReviewProps) => React.JSX.Element
>;



const StudyReview = (props: StudyReviewProps) => {
  const presentationTarget = usePresentationTarget();
  const Component = STUDY_REVIEW_COMPONENTS[presentationTarget];
  return <Component {...props} />;
};



export { StudyReview };
