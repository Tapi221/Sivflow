import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";

const LoadingFallback = () => {
  return <LoadingSpinner className="min-h-dvh w-full text-slate-400" iconClassName="h-6 w-6" />;
};

export { LoadingFallback };
