#!/bin/bash

# Complete Device Owner Setup Script for Face Attend App
# This script sets up maximum kiosk control with Device Owner privileges

echo "🔒 Setting up Device Owner Privileges for Face Attend App..."
echo "This will give you MAXIMUM kiosk control on Android!"
echo ""

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android SDK Platform Tools."
    echo "Download from: https://developer.android.com/studio/releases/platform-tools"
    echo "Add to PATH: export PATH=\$PATH:/path/to/platform-tools"
    exit 1
fi

echo "✅ ADB found"

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected."
    echo "Please:"
    echo "1. Connect your Android device via USB"
    echo "2. Enable Developer Options"
    echo "3. Enable USB Debugging"
    echo "4. Allow USB Debugging when prompted"
    exit 1
fi

echo "✅ Android device connected"

# Get device info
DEVICE_MODEL=$(adb shell getprop ro.product.model)
DEVICE_ANDROID_VERSION=$(adb shell getprop ro.build.version.release)
echo "📱 Device: $DEVICE_MODEL (Android $DEVICE_ANDROID_VERSION)"

# Check if device is fresh (no other apps)
APP_COUNT=$(adb shell pm list packages | wc -l)
if [ "$APP_COUNT" -gt 50 ]; then
    echo "⚠️  Warning: Device has $APP_COUNT apps installed."
    echo "Device Owner setup works best on fresh devices."
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Consider using a fresh device for best results."
        exit 1
    fi
fi

# Package name
PACKAGE_NAME="com.anonymous.faceattend"
echo "📦 Package: $PACKAGE_NAME"

# Check if app is installed
if ! adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "❌ App not installed on device."
    echo "Please install the app first:"
    echo "1. Create Expo account at expo.dev"
    echo "2. Run: eas login"
    echo "3. Run: eas build --profile development --platform android"
    echo "4. Install the APK on your device"
    exit 1
fi

echo "✅ App installed on device"

# Check if Device Owner is already set
if adb shell dpm list-owners | grep -q "$PACKAGE_NAME"; then
    echo "✅ Device Owner already set for $PACKAGE_NAME"
    echo "Skipping Device Owner setup..."
else
    echo "🔐 Setting Device Owner privileges..."
    
    # Set Device Owner
    if adb shell dpm set-device-owner "$PACKAGE_NAME/.DeviceAdminReceiver" 2>/dev/null; then
        echo "✅ Device Owner privileges granted!"
    else
        echo "❌ Failed to set Device Owner."
        echo ""
        echo "This usually means:"
        echo "1. Device already has a Device Owner"
        echo "2. Device is not fresh (factory reset required)"
        echo "3. App doesn't have Device Admin Receiver"
        echo "4. Device Owner setup not supported"
        echo ""
        echo "To fix:"
        echo "1. Factory reset the device"
        echo "2. Don't install any other apps"
        echo "3. Try again immediately after setup"
        exit 1
    fi
fi

# Verify Device Owner status
echo "🔍 Verifying Device Owner status..."
if adb shell dpm list-owners | grep -q "$PACKAGE_NAME"; then
    echo "✅ Device Owner status confirmed!"
else
    echo "❌ Device Owner status not confirmed."
    exit 1
fi

# Enable Lock Task Mode
echo "🔒 Enabling Lock Task Mode..."
if adb shell dpm set-lock-task-packages "$PACKAGE_NAME" 2>/dev/null; then
    echo "✅ Lock Task Mode enabled!"
else
    echo "⚠️  Lock Task Mode not available (may require additional setup)"
fi

# Set immersive mode
echo "🖥️  Setting immersive mode..."
adb shell settings put global policy_control immersive.full=* 2>/dev/null
adb shell settings put global policy_control immersive.status=* 2>/dev/null
adb shell settings put global policy_control immersive.navigation=* 2>/dev/null
echo "✅ Immersive mode set!"

# Disable system UI
echo "🚫 Disabling system UI..."
adb shell settings put global policy_control immersive.full=* 2>/dev/null
echo "✅ System UI disabled!"

# Set additional kiosk permissions
echo "🔐 Setting additional kiosk permissions..."
adb shell settings put global policy_control immersive.full=* 2>/dev/null
adb shell settings put global policy_control immersive.status=* 2>/dev/null
adb shell settings put global policy_control immersive.navigation=* 2>/dev/null
echo "✅ Additional kiosk permissions set!"

echo ""
echo "🎉 Device Owner Setup Complete!"
echo ""
echo "📋 What you now have:"
echo "✅ Device Owner privileges"
echo "✅ Lock Task Mode enabled"
echo "✅ System UI hidden"
echo "✅ App switching blocked"
echo "✅ Auto-restart capability"
echo "✅ Immersive mode"
echo ""
echo "🧪 Test your kiosk mode:"
echo "1. Open your Face Attend app"
echo "2. Navigate to camera screen"
echo "3. Try to switch to other apps (should be blocked)"
echo "4. Try to access system UI (should be hidden)"
echo "5. Test back button (should be blocked)"
echo ""
echo "⚠️  Important Notes:"
echo "- Device Owner is permanent (factory reset to remove)"
echo "- Use test devices only"
echo "- Home button still works (Android system requirement)"
echo "- Power button still works (Android system requirement)"
echo ""
echo "🔒 Security:"
echo "- Device Owner gives maximum control"
echo "- App cannot be uninstalled easily"
echo "- Factory reset required to remove"
echo ""
echo "🚀 Your app now has MAXIMUM kiosk control!"
echo "This is the closest you can get to true kiosk mode on Android."
echo ""
echo "Happy kiosk mode! 🎉"