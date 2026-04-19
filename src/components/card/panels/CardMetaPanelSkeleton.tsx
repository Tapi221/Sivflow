import { EmptyMetaPanel } from "@/components/card/panels/EmptyMetaPanel";
import { MetaPanelLeadSection } from "@/components/card/panels/MetaPanelShell";
import { Skeleton } from "@/components/ui/skeleton";

export const CardMetaPanelSkeleton = () => {
  return (
    <EmptyMetaPanel>
      <MetaPanelLeadSection>
        <div className="space-y-2">
          <Skeleton className="h-[var(--meta-row-px)] w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>

        <section>
          <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
            <Skeleton className="h-[var(--meta-row-px)] w-16" />
            <Skeleton className="h-[var(--meta-row-px)] w-20 rounded-full" />
          </div>
          <div className="mt-2 rounded-xl border border-[color:var(--meta-panel-border)] bg-[color:var(--meta-panel-surface-muted)] p-2">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
          </div>
        </section>

        <div className="space-y-2">
          <Skeleton className="h-[var(--meta-row-px)] w-36" />
          <Skeleton className="h-[var(--meta-row-px)] w-32" />
          <Skeleton className="h-[var(--meta-row-px)] w-40" />
          <Skeleton className="h-[var(--meta-row-px)] w-44" />
        </div>
      </MetaPanelLeadSection>

      <section>
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-[92px] rounded-2xl" />
          <Skeleton className="h-[92px] rounded-2xl" />
          <Skeleton className="h-[92px] rounded-2xl" />
          <Skeleton className="h-[92px] rounded-2xl" />
        </div>
      </section>

      <section>
        <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
          <Skeleton className="h-[var(--meta-row-px)] w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-[var(--meta-row-px)] w-14 rounded-full" />
            <Skeleton className="h-[var(--meta-row-px)] w-16 rounded-full" />
            <Skeleton className="h-[var(--meta-row-px)] w-16 rounded-full" />
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[24px] border border-[color:var(--meta-panel-border)] bg-[color:var(--meta-panel-surface-elevated)]">
          <div className="border-b border-[color:var(--meta-panel-border)] px-3 py-3">
            <Skeleton className="h-3 w-20" />
            <div className="mt-2 flex items-end justify-between gap-3">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="h-44 px-3 py-3">
            <div className="flex h-full items-end gap-2">
              <Skeleton className="h-[34%] flex-1 rounded-xl" />
              <Skeleton className="h-[52%] flex-1 rounded-xl" />
              <Skeleton className="h-[68%] flex-1 rounded-xl" />
              <Skeleton className="h-[58%] flex-1 rounded-xl" />
              <Skeleton className="h-[76%] flex-1 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex min-h-[var(--meta-action-min-h)] items-center justify-between">
          <Skeleton className="h-[var(--meta-row-px)] w-16" />
          <Skeleton className="h-[var(--meta-row-px)] w-14 rounded-full" />
        </div>

        <div className="mt-3 overflow-hidden rounded-[20px] border border-[color:var(--meta-panel-border)] bg-[color:var(--meta-panel-surface)]">
          <div className="grid grid-cols-[36px_1.4fr_0.8fr_0.9fr] gap-2 border-b border-[color:var(--meta-panel-border)] px-3 py-2">
            <Skeleton className="h-3 w-4" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-14" />
          </div>

          <div className="space-y-2 px-3 py-3">
            <div className="grid grid-cols-[36px_1.4fr_0.8fr_0.9fr] items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="grid grid-cols-[36px_1.4fr_0.8fr_0.9fr] items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="grid grid-cols-[36px_1.4fr_0.8fr_0.9fr] items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-10 rounded-full" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>
      </section>
    </EmptyMetaPanel>
  );
};
