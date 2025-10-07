#!/bin/bash

# Shifteo Deployment Script
# Builds the app and deploys to /opt/shifteo

set -e  # Exit on error

DEPLOY_DIR="/opt/shifteo"
BUILD_DIR="dist"

echo "================================================"
echo "  Shifteo Deployment Script"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Step 1: Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Deployment aborted."
    exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Error: Build directory '$BUILD_DIR' not found!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p "$DEPLOY_DIR"

# Step 3: Clear old files (but keep the directory)
echo "🧹 Clearing old files from $DEPLOY_DIR..."
sudo rm -rf "$DEPLOY_DIR"/*

# Step 4: Copy new build
echo "📤 Copying build to $DEPLOY_DIR..."
sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR"/

# Step 5: Set permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

echo ""
echo "================================================"
echo "  ✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Build deployed to: $DEPLOY_DIR"
echo "Files deployed:"
sudo ls -lh "$DEPLOY_DIR" | tail -n +2 | wc -l | xargs echo "  - Total items:"
echo ""
echo "Next steps:"
echo "  1. Configure nginx/apache to serve from $DEPLOY_DIR"
echo "  2. Set up SSL with certbot"
echo "  3. Test at https://shifteo.akius.tools"
echo ""
