import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  const unread = await db.contactMessage.count({ where: { isRead: false } });
  return (
    <AdminShell userName={session.name} unreadCount={unread}>
      {children}
    </AdminShell>
  );
}
