import { Skeleton } from "@/components/ui/skeleton";

export const DatabaseSkeleton = () => {
  return (
    <div className="space-y-2 px-4 md:px-8">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
};
