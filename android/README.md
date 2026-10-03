# ShadowFox Android APK

This is a Trusted Web Activity for the live ShadowFox Card Vault. It launches
https://shadowfox-sports-card-vault.vercel.app/login and uses the real ShadowFox logo.
The website, accounts, camera/file uploads and exports run in a compatible Android browser.
Internet is required. It is not an offline inventory or a Google Play listing.

## Rebuild

Use JDK 17+, Android SDK platform 36 and build-tools 36.0.0. This project uses
Gradle 8.11.1 and Android Gradle Plugin 8.9.1. The launcher was generated with
Bubblewrap 1.25.0; source is included in `project`.

From `project`, run `./gradlew assembleRelease` with ANDROID_HOME configured.
The unsigned APK is `app/build/outputs/apk/release/app-release-unsigned.apk`.
Use Android SDK zipalign and apksigner to align and sign it with the supplied
private signing backup. Keep the same signing key and package for updates.
Increment versionCode/versionName in app/build.gradle for each APK release.

Public identity: ca.shadowfoxcards.vault. The SHA-256 signing fingerprint must
match the deployed `/.well-known/assetlinks.json`. Signing passwords and keystores
must never be put in the website or source repository.

The separate signing-backup ZIP contains the keystore and its password file.
Keep that ZIP private and backed up. This is a newly restored package; the older
CardTrack APK's signing key/package were not supplied, so in-place updates of an
older package are not verified.
