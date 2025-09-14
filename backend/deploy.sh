#!/bin/bash

# Exit on any error
set -e

echo "Starting Node.js deployment script"

# Install dependencies
echo "Installing dependencies..."
npm ci

echo "Node.js deployment completed successfully"