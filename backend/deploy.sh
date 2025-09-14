#!/bin/bash
set -e
echo "Starting Node.js deployment script"
echo "Installing dependencies..."
npm ci
echo "Node.js deployment completed successfully"