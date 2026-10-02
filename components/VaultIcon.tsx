type VaultIconProps = {
  name: string;
  size?: number;
  className?: string;
};

export default function VaultIcon({ name, size = 20, className }: VaultIconProps) {
  const paths = (() => {
    switch (name) {
      case "home":
        return <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h5v-7h4v7h5V9" /></>;
      case "grid":
        return <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>;
      case "scan":
        return <><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M2 12h20" /><path d="M8 8h8m-8 8h8" /></>;
      case "chart":
        return <path d="M4 3v18h17M8 17v-5m5 5V8m5 9V5" />;
      case "plus":
        return <path d="M12 5v14M5 12h14" />;
      case "search":
        return <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>;
      case "filter":
        return <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" /></>;
      case "heart":
        return <path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z" />;
      case "chevron":
        return <path d="m6 9 6 6 6-6" />;
      case "logout":
        return <path d="M9 4H4v16h5m5-12 4 4-4 4m-6-4h13" />;
      case "shield":
        return <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>;
      case "arrow":
        return <path d="M4 12h16m-6-6 6 6-6 6" />;
      case "close":
        return <path d="m6 6 12 12M6 18 18 6" />;
      case "edit":
        return <path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-3-3L6 16l-2 4Z" />;
      case "camera":
        return <><path d="M4 7h4l2-3h4l2 3h4a1 1 0 0 1 1 1v12H3V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /></>;
      case "binder":
        return <><rect x="5" y="3" width="15" height="18" rx="2" /><path d="M9 3v18M3 7h4M3 12h4M3 17h4m9-10h-3m3 4h-3" /></>;
      default:
        return <rect x="4" y="3" width="16" height="18" rx="2" />;
    }
  })();

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ? `vaultIcon ${className}` : "vaultIcon"} aria-hidden="true" focusable="false">{paths}</svg>;
}
