import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-1 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-3">
             <Skeleton className="h-4 w-20" />
             <Skeleton className="h-8 w-24" />
             <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
           <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                 <Skeleton className="h-6 w-32" />
                 <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <Skeleton className="h-[200px] w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                 <Skeleton className="h-12 w-full rounded-xl" />
                 <Skeleton className="h-12 w-full rounded-xl" />
              </div>
           </div>
           
           <div className="rounded-[2rem] border border-white/5 bg-white/5 p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="space-y-3">
                 {[...Array(3)].map((_, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Skeleton className="h-10 w-10 rounded-full" />
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                         </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-[150px] w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-full" />
           </div>
           <div className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-4">
              <Skeleton className="h-5 w-24" />
              <div className="space-y-3">
                 {[...Array(5)].map((_, i) => (
                   <Skeleton key={i} className="h-12 w-full rounded-lg" />
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
