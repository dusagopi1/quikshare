#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
npm install

# Create production build
npm run build --if-present