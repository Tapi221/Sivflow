import type { ComponentProps } from "react";
import { CardCarousel3D } from "@/features/review/presentation/web/ui/components/CardCarousel3D";
import StudyCard from "./StudyCard";
import type { Card } from "@/types";

type StudyCardProps = ComponentProps<typeof StudyCard>;

type ReviewResultHandler = Extract<StudyCardProps, { mode: "review" }>["onResult"];
type PracticeResultHandler = Extract<StudyCardProps, { mode: "practice