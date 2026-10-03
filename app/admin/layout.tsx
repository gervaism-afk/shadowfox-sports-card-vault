import PageShell from "@/components/PageShell";

import AdminGate from "@/components/admin/AdminGate";
import AdminNavigation from "@/components/admin/AdminNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <AdminGate>
        <AdminNavigation />
        {children}
      </AdminGate>
    </PageShell>
  );
}
