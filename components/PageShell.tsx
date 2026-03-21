import AppHeader from "@/components/AppHeader";

export default function PageShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="pageShell">
      <div className="container">
        <AppHeader />
        {title ? <h1 className="pageTitle">{title}</h1> : null}
        {children}
      </div>
    </main>
  );
}
