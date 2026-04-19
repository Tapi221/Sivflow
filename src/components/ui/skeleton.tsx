import { cn } from "@/lib/utils";

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[color:var(--skeleton-base)]",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.6s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, transparent 28%, var(--skeleton-highlight) 52%, transparent 76%, transparent 100%)",
        }}
      />
    </div>
  );
};

export { Skeleton };
