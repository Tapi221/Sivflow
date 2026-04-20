
import type { ReactNode } from "react";

import { CardMetaPanelSkeleton } from "@/components/card/panels/CardMetaPanelSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ScreenSkeletonSurfaceProps = {
  children: ReactNode;
  className?: string;
};

const ScreenSkeletonSurface = ({
  children,
  className,
}: ScreenSkeletonSurfaceProps) => {
  return (
    <div
      className={cn(
        "relative h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,var(--app-bg-dot)_1px,transparent_0)] [background-size:var(--app-bg-dot-gap)_var(--app-bg-dot-gap)]",
        className,
      )}
      style={{
        backgroundColor: "var(--app-bg)",
      }}
    >
      {children}
    </div>
  );
};

type ScreenSkeletonCardProps = {
  children: ReactNode;
  className?: string;
};

const ScreenSkeletonCard = ({
  children,
  className,
}: ScreenSkeletonCardProps) => {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--surface-border)] bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
};

type SectionTitleSkeletonProps = {
  className?: string;
};

const SectionTitleSkeleton = ({ className }: SectionTitleSkeletonProps) => {
  return <Skeleton className={cn("h-4 w-28 rounded-full", className)} />;
};

export const AppBootLoadingFallback = () => {
  return (
    <div className="fixed inset-0 z-[999]">
      <ScreenSkeletonSurface className="h-full">
        <div className="flex h-full min-h-0">
          <aside className="hidden h-full w-[280px] shrink-0 border-r border-slate-200/80 bg-white/72 px-4 py-5 md:block">
            <div className="space-y-4">
              <Skeleton className="h-8 w-36 rounded-full" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
              </div>
              <div className="space-y-3 pt-6">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-[82%] rounded-xl" />
                <Skeleton className="h-9 w-[88%] rounded-xl" />
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
            <ScreenSkeletonCard className="flex h-full min-h-0 flex-col p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-9 w-56 rounded-2xl" />
                </div>
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>

              <div className="mt-6 grid flex-1 min-h-0 gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <ScreenSkeletonCard className="p-5 md:p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-40 rounded-2xl" />
                    <Skeleton className="h-5 w-[72%]" />
                    <div className="grid gap-3 pt-2 md:grid-cols-2">
                      <Skeleton className="h-24 rounded-3xl" />
                      <Skeleton className="h-24 rounded-3xl" />
                      <Skeleton className="h-24 rounded-3xl" />
                      <Skeleton className="h-24 rounded-3xl" />
                    </div>
                  </div>
                </ScreenSkeletonCard>

                <ScreenSkeletonCard className="p-5 md:p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-32 rounded-2xl" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[68%]" />
                    <div className="space-y-3 pt-3">
                      <Skeleton className="h-12 w-full rounded-2xl" />
                      <Skeleton className="h-12 w-full rounded-2xl" />
                      <Skeleton className="h-12 w-full rounded-2xl" />
                    </div>
                  </div>
                </ScreenSkeletonCard>
              </div>
            </ScreenSkeletonCard>
          </main>
        </div>
      </ScreenSkeletonSurface>
    </div>
  );
};

export const AppShellLoadingFallback = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="flex h-full min-h-0 flex-col p-4 md:p-6">
        <ScreenSkeletonCard className="flex h-full min-h-0 flex-col p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-9 w-40 rounded-2xl" />
            </div>
            <div className="hidden gap-2 md:flex">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </div>

          <div className="mt-6 grid flex-1 min-h-0 gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
            <ScreenSkeletonCard className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-10 w-[92%] rounded-2xl" />
                <Skeleton className="h-10 w-[84%] rounded-2xl" />
                <Skeleton className="h-10 w-[88%] rounded-2xl" />
                <Skeleton className="h-10 w-[80%] rounded-2xl" />
              </div>
            </ScreenSkeletonCard>

            <ScreenSkeletonCard className="p-5 md:p-6">
              <div className="space-y-4">
                <Skeleton className="h-7 w-44 rounded-2xl" />
                <Skeleton className="h-5 w-[72%]" />
                <Skeleton className="h-[52vh] w-full rounded-[32px]" />
              </div>
            </ScreenSkeletonCard>
          </div>
        </ScreenSkeletonCard>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const FoldersScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="flex h-full min-h-0 flex-col p-4 md:p-6">
        <div className="grid h-full min-h-0 gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
          <ScreenSkeletonCard className="min-h-0 p-4">
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-11 w-[92%] rounded-2xl" />
              <Skeleton className="h-11 w-[86%] rounded-2xl" />
              <Skeleton className="h-11 w-[90%] rounded-2xl" />
              <Skeleton className="h-11 w-[78%] rounded-2xl" />
              <div className="pt-4 space-y-3">
                <Skeleton className="h-9 w-[70%] rounded-xl" />
                <Skeleton className="h-9 w-[82%] rounded-xl" />
                <Skeleton className="h-9 w-[64%] rounded-xl" />
              </div>
            </div>
          </ScreenSkeletonCard>

          <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
            <ScreenSkeletonCard className="min-h-0 p-5 md:p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-9 w-52 rounded-2xl" />
                    <Skeleton className="h-4 w-72 max-w-[85%]" />
                  </div>
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>

                <ScreenSkeletonCard className="p-4 md:p-5">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-[88%]" />
                    <Skeleton className="h-4 w-[82%]" />
                    <Skeleton className="h-4 w-[74%]" />
                  </div>
                </ScreenSkeletonCard>

                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton className="h-28 rounded-3xl" />
                  <Skeleton className="h-28 rounded-3xl" />
                  <Skeleton className="h-28 rounded-3xl" />
                  <Skeleton className="h-28 rounded-3xl" />
                </div>
              </div>
            </ScreenSkeletonCard>

            <ScreenSkeletonCard className="min-h-0 p-4">
              <div className="space-y-3">
                <SectionTitleSkeleton className="w-24" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-[240px] w-full rounded-[28px]" />
                <Skeleton className="h-10 w-full rounded-2xl" />
              </div>
            </ScreenSkeletonCard>
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const CardSetViewDesktopContentSkeleton = () => {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
      <ScreenSkeletonCard className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-40 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>

        <div className="flex flex-1 min-h-0 items-center justify-center py-4 md:py-8">
          <div className="relative w-full max-w-[980px]">
            <ScreenSkeletonCard className="overflow-hidden rounded-[32px] md:rounded-[40px] p-4 md:p-5">
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-[78%]" />
                <Skeleton className="h-[420px] md:h-[560px] w-full rounded-[28px]" />
                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton className="h-12 rounded-2xl" />
                  <Skeleton className="h-12 rounded-2xl" />
                </div>
              </div>
            </ScreenSkeletonCard>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 md:bottom-5 md:right-5">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-12 w-[220px] rounded-full" />
        </div>
      </ScreenSkeletonCard>
    </div>
  );
};

export const CardSetViewScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="flex h-full min-h-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 p-0 md:p-0">
              <CardSetViewDesktopContentSkeleton />
            </div>

            <aside className="hidden h-full w-[var(--ui-panel-width)] shrink-0 border-l border-slate-200/80 bg-white/80 md:block">
              <div className="h-full overflow-hidden px-2 py-2">
                <CardMetaPanelSkeleton />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const CardEditScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="relative flex h-full min-h-0 flex-col px-0 py-0 text-slate-800">
        <div className="pointer-events-none absolute inset-x-0 top-12 z-20 hidden md:block">
          <div className="mx-auto flex max-w-[1400px] px-4">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] px-0 md:px-4">
          <div className="grid h-full min-h-0 w-full gap-5 md:grid-cols-[minmax(0,1fr)_var(--ui-panel-width)] md:py-4">
            <ScreenSkeletonCard className="min-h-0 overflow-hidden rounded-none border-x-0 border-y-0 md:rounded-[32px] md:border md:p-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="h-9 w-64 rounded-2xl" />
                  </div>
                  <div className="hidden gap-2 md:flex">
                    <Skeleton className="h-10 w-24 rounded-full" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <ScreenSkeletonCard className="p-4 md:p-5">
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full rounded-2xl" />
                      <Skeleton className="h-[180px] w-full rounded-[28px]" />
                      <Skeleton className="h-4 w-[92%]" />
                      <Skeleton className="h-4 w-[88%]" />
                      <Skeleton className="h-4 w-[76%]" />
                    </div>
                  </ScreenSkeletonCard>

                  <ScreenSkeletonCard className="p-4">
                    <div className="space-y-3">
                      <SectionTitleSkeleton className="w-20" />
                      <Skeleton className="h-24 w-full rounded-3xl" />
                      <Skeleton className="h-24 w-full rounded-3xl" />
                    </div>
                  </ScreenSkeletonCard>
                </div>

                <ScreenSkeletonCard className="p-4 md:p-5">
                  <div className="space-y-3">
                    <SectionTitleSkeleton className="w-24" />
                    <Skeleton className="h-[220px] w-full rounded-[28px]" />
                  </div>
                </ScreenSkeletonCard>
              </div>
            </ScreenSkeletonCard>

            <aside className="hidden min-h-0 md:block">
              <ScreenSkeletonCard className="h-full overflow-hidden p-2">
                <CardMetaPanelSkeleton />
              </ScreenSkeletonCard>
            </aside>
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const StudyModeScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-[100dvh]">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col p-3 md:px-8 md:py-4">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4 px-2 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-8 w-56 rounded-2xl" />
            </div>
          </div>
          <Skeleton className="h-10 w-20 rounded-2xl" />
        </div>

        <Skeleton className="mb-6 h-2 shrink-0 rounded-full md:mb-8" />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <ScreenSkeletonCard className="w-full max-w-[960px] p-4 md:p-5">
            <div className="space-y-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-[76%]" />
              <Skeleton className="h-[420px] md:h-[520px] w-full rounded-[32px]" />
            </div>
          </ScreenSkeletonCard>

          <div className="mt-5 grid w-full max-w-[960px] gap-3 md:grid-cols-4">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const CalendarScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="relative flex h-full min-h-0">
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-0 pt-4 md:p-8">
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 md:gap-8">
            <ScreenSkeletonCard className="relative min-h-[600px] p-4 md:p-10">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-9 w-48 rounded-2xl" />
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-24 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>

              <div className="pt-12 md:pt-14">
                <div className="grid grid-cols-7 gap-2 md:gap-3">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <Skeleton
                      key={`calendar-head-${index}`}
                      className="h-8 rounded-xl"
                    />
                  ))}
                  {Array.from({ length: 35 }).map((_, index) => (
                    <Skeleton
                      key={`calendar-cell-${index}`}
                      className="aspect-square rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            </ScreenSkeletonCard>
          </div>

          <div className="mt-6 grid gap-3 pb-6 md:grid-cols-4">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>

        <aside className="hidden h-full w-[var(--ui-panel-width)] shrink-0 border-l border-slate-200/80 bg-white/80 p-4 md:block">
          <div className="space-y-4">
            <Skeleton className="h-10 w-28 rounded-full" />
            <ScreenSkeletonCard className="p-4">
              <div className="space-y-3">
                <SectionTitleSkeleton className="w-24" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-[80%]" />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
              </div>
            </ScreenSkeletonCard>
          </div>
        </aside>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const TagMapScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="h-full w-full px-6 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-6">
          <ScreenSkeletonCard className="p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-9 w-40 rounded-2xl" />
                <Skeleton className="h-4 w-[520px] max-w-full" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Skeleton className="h-12 w-[240px] rounded-2xl" />
                <Skeleton className="h-12 w-32 rounded-2xl" />
              </div>
            </div>
          </ScreenSkeletonCard>

          <div className="grid flex-1 min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <ScreenSkeletonCard className="min-h-0 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <SectionTitleSkeleton className="w-20" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              <div className="relative h-[70dvh] min-h-[620px] overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                <Skeleton className="absolute left-12 top-16 h-20 w-48 rounded-[20px]" />
                <Skeleton className="absolute left-96 top-20 h-20 w-48 rounded-[20px]" />
                <Skeleton className="absolute left-[44rem] top-16 h-20 w-48 rounded-[20px]" />
                <Skeleton className="absolute left-[22rem] top-56 h-20 w-48 rounded-[20px]" />
                <Skeleton className="absolute left-[54rem] top-64 h-20 w-48 rounded-[20px]" />
                <Skeleton className="absolute left-[10rem] top-[28rem] h-20 w-48 rounded-[20px]" />
              </div>
            </ScreenSkeletonCard>

            <ScreenSkeletonCard className="p-6">
              <div className="space-y-4">
                <SectionTitleSkeleton className="w-24" />
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <Skeleton className="h-11 w-full rounded-2xl" />
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton
                      key={`tag-color-${index}`}
                      className="h-11 rounded-2xl"
                    />
                  ))}
                </div>
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </ScreenSkeletonCard>
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const DirectoryScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="flex h-full min-h-0 flex-col p-4 md:p-6">
        <ScreenSkeletonCard className="flex h-full min-h-0 flex-col p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-9 w-44 rounded-2xl" />
            </div>
            <div className="hidden gap-2 md:flex">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
            </div>
          </div>

          <div className="mt-6 grid flex-1 min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <ScreenSkeletonCard className="relative min-h-[560px] overflow-hidden p-4 md:p-5">
              <Skeleton className="absolute left-10 top-10 h-14 w-36 rounded-2xl" />
              <Skeleton className="absolute left-56 top-24 h-14 w-44 rounded-2xl" />
              <Skeleton className="absolute left-[28rem] top-16 h-14 w-40 rounded-2xl" />
              <Skeleton className="absolute left-[18rem] top-[14rem] h-14 w-48 rounded-2xl" />
              <Skeleton className="absolute left-[42rem] top-[18rem] h-14 w-44 rounded-2xl" />
              <Skeleton className="absolute left-[10rem] top-[24rem] h-14 w-36 rounded-2xl" />
              <Skeleton className="absolute left-[32rem] top-[30rem] h-14 w-40 rounded-2xl" />
            </ScreenSkeletonCard>

            <ScreenSkeletonCard className="p-4">
              <div className="space-y-3">
                <SectionTitleSkeleton className="w-24" />
                <Skeleton className="h-24 rounded-3xl" />
                <Skeleton className="h-24 rounded-3xl" />
                <Skeleton className="h-24 rounded-3xl" />
              </div>
            </ScreenSkeletonCard>
          </div>
        </ScreenSkeletonCard>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const GalleryScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="mx-auto h-full max-w-7xl p-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-9 w-40 rounded-2xl" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ScreenSkeletonCard
                key={`gallery-${index}`}
                className="overflow-hidden p-3"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                <div className="space-y-3 p-2 pt-4">
                  <Skeleton className="h-5 w-[70%]" />
                  <Skeleton className="h-4 w-[88%]" />
                  <Skeleton className="h-4 w-[62%]" />
                </div>
              </ScreenSkeletonCard>
            ))}
          </div>
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const TrashScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="mx-auto max-w-[1400px] p-6 md:p-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-10 w-44 rounded-2xl" />
          </div>

          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-44 rounded-2xl" />
        </div>

        <ScreenSkeletonCard className="mb-4 flex items-center justify-between gap-4 p-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </ScreenSkeletonCard>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ScreenSkeletonCard key={`trash-${index}`} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-9 w-32 rounded-xl" />
              </div>

              <div className="mt-4 space-y-2 pl-8">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            </ScreenSkeletonCard>
          ))}
        </div>
      </div>
    </ScreenSkeletonSurface>
  );
};

export const RedirectPageScreenSkeleton = () => {
  return (
    <ScreenSkeletonSurface className="h-full">
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <ScreenSkeletonCard className="w-full max-w-2xl p-6 md:p-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-2xl" />
            <Skeleton className="h-4 w-[82%]" />
            <Skeleton className="h-4 w-[70%]" />
            <div className="grid gap-3 pt-2 md:grid-cols-2">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-24 rounded-3xl" />
            </div>
          </div>
        </ScreenSkeletonCard>
      </div>
    </ScreenSkeletonSurface>
  );
};
