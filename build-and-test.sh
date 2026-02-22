#!/bin/bash

# Quick Build & Install Script for Nexent Mobile App

echo "🚀 Building and Installing Nexent..."
echo ""

# Navigate to project directory
cd /home/krrish/Desktop/Nexent/mobile/nexent

# Step 1: Clean Metro cache
echo "📦 Cleaning Metro cache..."
npx expo start --clear &
sleep 3
pkill -f "expo start"

# Step 2: Build release APK without gradle (using expo)
echo "🔨 Building production APK..."
npx expo export:android --clear

# If that doesn't work, just run in development mode
echo ""
echo "⚠️  Note: For production build, use:"
echo "   eas build --platform android --profile production"
echo ""
echo "🎯 For now, testing with development mode..."
echo "   npx expo start --android"
