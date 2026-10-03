import Link from "next/link";
import PageShell from "@/components/PageShell";

export default function AndroidDownloadPage() {
  return <PageShell title="ShadowFox for Android">
    <section className="panel workflowPanel">
      <div className="workflowPanelHeading"><h2>Your vault, on your phone.</h2></div>
      <p>Scan cards, organize your collection and track your sets in the ShadowFox Android app. Sign in with your existing vault account.</p>
      <div className="buttonRow"><a className="btn primary" href="/downloads/shadowfox-card-vault-1.0.0.apk" download>Download Android APK</a><Link className="btn ghost" href="/login">Open the web app</Link></div>
      <p className="helperText">Version 1.0.0 · Android 6 or newer · Internet connection required.</p>
      <h3>Install on Android</h3>
      <ol>
        <li>Download the APK on your phone and open the downloaded file.</li>
        <li>If Android asks, allow this browser to install apps, then tap Install.</li>
        <li>Open ShadowFox Vault and sign in or create an account.</li>
      </ol>
      <p className="helperText">Keep Chrome or another compatible browser updated. Website updates appear automatically in the app. This download is provided directly by ShadowFox; it is not a Google Play listing.</p>
    </section>
  </PageShell>;
}
