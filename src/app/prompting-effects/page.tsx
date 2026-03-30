import { StudioDashboard } from "@/components/StudioDashboard";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

function StudioDashboardFallback() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <div className="h-96 animate-pulse bg-white/5 rounded-3xl" />
    </div>
  );
}

export default function PromptingEffectsPage() {
  return (
    <Suspense fallback={<StudioDashboardFallback />}>
      <StudioDashboard />
    </Suspense>
  );
}
