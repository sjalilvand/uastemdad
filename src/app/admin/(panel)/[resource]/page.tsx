import { ResourceManager } from "@/components/admin/resource-manager";
import { getResource } from "@/lib/admin-resources";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const def = getResource(resource);
  if (!def) notFound();
  return <ResourceManager resourceKey={resource} />;
}
