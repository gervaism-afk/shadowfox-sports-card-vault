#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}"
: "${SHADOWFOX_KEYSTORE:?Set SHADOWFOX_KEYSTORE to the release keystore path}"
: "${SHADOWFOX_PASSWORD_FILE:?Set SHADOWFOX_PASSWORD_FILE to its private password file}"
./gradlew --no-daemon --max-workers=2 assembleRelease
mkdir -p dist
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -P 16 -f 4 app/build/outputs/apk/release/app-release-unsigned.apk dist/shadowfox-card-vault-aligned.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" sign --ks "$SHADOWFOX_KEYSTORE" --ks-key-alias shadowfox --ks-pass "file:$SHADOWFOX_PASSWORD_FILE" --out dist/shadowfox-card-vault-1.0.0.apk dist/shadowfox-card-vault-aligned.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs dist/shadowfox-card-vault-1.0.0.apk
