#!/bin/bash

echo "🚀 Starting BookYolo iOS Deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Clean install
echo "🧹 Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Verify EAS CLI
echo "✅ Verifying EAS CLI..."
npx eas-cli --version

# Check if logged in
if ! npx eas-cli whoami &> /dev/null; then
    echo "🔐 Please login to EAS..."
    npx eas-cli login
fi

# Build
echo "🔨 Building iOS app..."
npx eas-cli build --platform ios --profile production

# Submit (if build succeeds)
if [ $? -eq 0 ]; then
    echo "📤 Submitting to App Store..."
    npx eas-cli submit --platform ios --profile production
    echo "✅ Deployment complete!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi












