import PageShell from "@/components/PageShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
