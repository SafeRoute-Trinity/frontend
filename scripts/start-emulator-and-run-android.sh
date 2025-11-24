#!/usr/bin/env bash
set -euo pipefail

# Auto-start an Android emulator (if none connected) then run expo run:android.
# macOS default SDK location fallback
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

if ! command -v adb >/dev/null 2>&1; then
  echo "[error] adb not found. Install Android Studio + SDK Platform Tools." >&2
  exit 1
fi

CONNECTED=$(adb devices | awk 'NR>1 && $2=="device"')
if [ -n "$CONNECTED" ]; then
  echo "[info] Device/emulator already connected:"
  adb devices
else
  echo "[info] No active device. Attempting to start an emulator..."
  if ! command -v emulator >/dev/null 2>&1; then
    echo "[error] emulator binary not found at $ANDROID_SDK_ROOT/emulator. Install Android Emulator component via Android Studio." >&2
    exit 1
  fi
  AVD_LIST=$(emulator -list-avds || true)
  if [ -z "$AVD_LIST" ]; then
    echo "[error] No AVDs found. Create one in Android Studio (Tools > Device Manager)." >&2
    exit 1
  fi
  # Prefer a Pixel device if present
  AVD_NAME=$(echo "$AVD_LIST" | grep -m1 -E 'Pixel' || echo "$AVD_LIST" | head -n1)
  echo "[info] Starting emulator: $AVD_NAME"
  nohup emulator -avd "$AVD_NAME" -netdelay none -netspeed full >/dev/null 2>&1 &

  echo "[info] Waiting for emulator to boot..."
  # Wait until sys.boot_completed == 1
  BOOTED=0
  for i in {1..120}; do
    if adb shell getprop sys.boot_completed 2>/dev/null | grep -q '1'; then
      BOOTED=1
      break
    fi
    sleep 2
  done
  if [ $BOOTED -ne 1 ]; then
    echo "[error] Emulator failed to boot within timeout." >&2
    exit 1
  fi
  echo "[info] Emulator booted." 
fi

# Run the Android build/install
exec npx expo run:android
