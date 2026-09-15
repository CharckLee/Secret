import { notFound } from "next/navigation";
import { SubjectDetail } from "@/components/SubjectDetail";
import { getSubjectDetail } from "@/lib/queries";
import type { SubjectDetail as SubjectDetailData } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSubjectDetail(id);
  if (!data) notFound();
  // 序列化 Date → string，保证传给客户端组件的是纯可序列化数据
  const serialized = JSON.parse(
    JSON.stringify(data),
  ) as SubjectDetailData;
  return <SubjectDetail initialData={serialized} />;
}
