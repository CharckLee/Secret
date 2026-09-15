import { HomeDashboard } from "@/components/HomeDashboard";
import { getHomeStats, getSubjectProgressRows } from "@/lib/queries";
import type { StatsResponse, SubjectRow } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [subjects, stats] = await Promise.all([
    getSubjectProgressRows(),
    getHomeStats(),
  ]);
  return (
    <HomeDashboard
      initialSubjects={subjects as SubjectRow[]}
      initialStats={stats as StatsResponse}
    />
  );
}
