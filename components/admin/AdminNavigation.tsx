"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function AdminNavigation() {
  const path = usePathname();
  return (
    <section className="adminWorkspace">
      <div className="vaultEyebrow">ShadowFox administration</div>
      <nav className="adminToolNav" aria-label="Admin tools">
        {[
          ["/admin", "Users & collections"],
          ["/admin/content", "Site content"],
          ["/admin/tools", "Catalogue tools"],
          ["/admin/system", "System status"],
          ["/admin/activity", "Activity history"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="helperText">
        Manage your site, collections and reference data.
      </p>
    </section>
  );
}
