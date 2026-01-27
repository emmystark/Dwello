#!/usr/bin/env node

/**
 * Dwello Backend - Quick Start Reference
 * 
 * Run this file to verify backend setup:
 * node quick-reference.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n' + '='.repeat(70));
console.log('  DWELLO BACKEND - SETUP VERIFICATION');
console.log('='.repeat(70) + '\n');

// Check Node.js
const nodeVersion = process.version;
console.log('✅ Node.js:', nodeVersion);

// Check npm
try {
  const npmVersion = execSync('npm -v').toString().trim();
  console.log('✅ npm:', npmVersion);
} catch (e) {
  console.log('❌ npm: NOT FOUND');
}

// Check files
const files = [
  'package.json',
  'api.js',
  'walrus-service.js',
  'payment-service.js',
  '.env.example',
  '.gitignore',
  'README.md',
  'SETUP_GUIDE.md'
];

console.log('\n📁 Backend Files:');
files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
});

// Check node_modules
const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'));
console.log('\n📦 Dependencies:');
if (nodeModulesExists) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    console.log(`  ✅ node_modules exists`);
    console.log(`  ✅ ${deps.length} dependencies defined`);
    console.log(`  ✅ ${devDeps.length} dev dependencies defined`);
  } catch (e) {
    console.log('  ❌ Error reading package.json');
  }
} else {
  console.log('  ❌ node_modules NOT installed');
  console.log('     Run: npm install');
}

// Check .env
console.log('\n⚙️  Configuration:');
const envExists = fs.existsSync(path.join(__dirname, '.env'));
if (envExists) {
  console.log('  ✅ .env file exists');
} else {
  console.log('  ⏳ .env file NOT created');
  console.log('     Run: cp .env.example .env');
}

// Required environment variables
console.log('\n🔐 Required Variables in .env:');
const requiredVars = [
  'PORT (default: 3001)',
  'NODE_ENV (default: development)',
  'WALRUS_AGGREGATOR_URL (testnet URL)',
  'WALRUS_PUBLISHER_URL (testnet URL)',
  'SUI_NETWORK (testnet)',
  'SUI_RPC_URL (testnet URL)',
  'WALRUS_PRIVATE_KEY (optional for dev)'
];
requiredVars.forEach(v => console.log(`  • ${v}`));

// Quick commands
console.log('\n🚀 Quick Commands:');
console.log('  npm run dev       - Start backend (development)');
console.log('  npm start         - Start backend (production)');
console.log('  npm list          - Show installed packages');
console.log('  npm install       - Install dependencies');

// Port check
console.log('\n🔌 Port Status:');
const server = net.createServer();
server.listen(3001, () => {
  console.log('  ✅ Port 3001 is available');
  server.close();
  showSummary();
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('  ❌ Port 3001 is IN USE (backend already running?)');
  } else {
    console.log('  ❓ Port 3001 error:', err.message);
  }
  showSummary();
});

function showSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('  SETUP STATUS');
  console.log('='.repeat(70));
  console.log('\n✅ Backend Setup Complete!');
  console.log('\n📋 Next Steps:');
  console.log('  1. cp .env.example .env');
  console.log('  2. npm run dev');
  console.log('  3. Backend runs on http://localhost:3001');
  console.log('\n📚 Documentation:');
  console.log('  • SETUP_GUIDE.md - Detailed setup instructions');
  console.log('  • README.md - Backend overview');
  console.log('  • .env.example - Configuration template');
  console.log('\n' + '='.repeat(70) + '\n');
}
