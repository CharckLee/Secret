import { HomeDashboard } from "@/components/HomeDashboard";
import {
  getContinueLearning,
  getHomeStats,
  getNodeStats,
  getSubjectProgressRows,
} from "@/lib/queries";
import type { StatsResponse, SubjectRow } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [subjects, stats, continueItems, nodeStats] = await Promise.all([
    getSubjectProgressRows(),
    getHomeStats(),
    getContinueLearning(),
    getNodeStats(),
  ]);
  return (
    <HomeDashboard
      initialSubjects={subjects as SubjectRow[]}
      initialStats={stats as StatsResponse}
      continueItems={continueItems}
      nodeStats={nodeStats}
    />
  );
}
