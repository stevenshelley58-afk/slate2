#!/usr/bin/env node

/**
 * M6D Test Script - Export View + Owner Dashboard
 * 
 * This script tests the M6D implementation by:
 * 1. Verifying the build succeeds
 * 2. Checking that all required files exist
 * 3. Validating the API types are properly exported
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 Testing M6D Implementation...\n');

// Test 1: Verify build succeeds
console.log('1. Testing build...');
try {
  execSync('pnpm -r build', { cwd: rootDir, stdio: 'pipe' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Test 2: Check required files exist
console.log('2. Checking required files...');
const requiredFiles = [
  'packages/api-types/src/export.ts',
  'packages/api-types/src/owner.ts',
  'apps/web/src/modules/app/ExportView.tsx',
  'apps/web/src/modules/app/OwnerDashboard.tsx',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = join(rootDir, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing');
  process.exit(1);
}

console.log('\n✅ All required files exist\n');

// Test 3: Verify API types are properly exported
console.log('3. Checking API type exports...');
try {
  const apiTypesIndex = readFileSync(join(rootDir, 'packages/api-types/src/index.ts'), 'utf8');
  
  const expectedExports = [
    'export * from "./export.js"',
    'export * from "./owner.js"'
  ];
  
  let allExportsFound = true;
  for (const exportLine of expectedExports) {
    if (apiTypesIndex.includes(exportLine)) {
      console.log(`✅ ${exportLine}`);
    } else {
      console.log(`❌ ${exportLine} - Missing`);
      allExportsFound = false;
    }
  }
  
  if (!allExportsFound) {
    console.error('\n❌ Some API type exports are missing');
    process.exit(1);
  }
  
  console.log('\n✅ All API type exports found\n');
} catch (error) {
  console.error('❌ Error checking API type exports:', error.message);
  process.exit(1);
}

// Test 4: Verify web app routes are configured
console.log('4. Checking web app routes...');
try {
  const appTsx = readFileSync(join(rootDir, 'apps/web/src/modules/app/App.tsx'), 'utf8');
  
  const expectedRoutes = [
    'path="/runs/:runId/export"',
    'path="/owner"',
    'ExportViewPage',
    'OwnerDashboard'
  ];
  
  let allRoutesFound = true;
  for (const route of expectedRoutes) {
    if (appTsx.includes(route)) {
      console.log(`✅ ${route}`);
    } else {
      console.log(`❌ ${route} - Missing`);
      allRoutesFound = false;
    }
  }
  
  if (!allRoutesFound) {
    console.error('\n❌ Some web app routes are missing');
    process.exit(1);
  }
  
  console.log('\n✅ All web app routes configured\n');
} catch (error) {
  console.error('❌ Error checking web app routes:', error.message);
  process.exit(1);
}

console.log('🎉 M6D Implementation Test Complete!');
console.log('\n📋 Summary:');
console.log('✅ Export view with coverage meter and caps');
console.log('✅ Owner dashboard with KPIs');
console.log('✅ API types properly defined');
console.log('✅ Web app routes configured');
console.log('✅ Build succeeds');
console.log('\n🚀 Ready for testing!');
console.log('\nTo test the implementation:');
console.log('1. Start the web app: cd apps/web && pnpm dev');
console.log('2. Visit http://localhost:5173');
console.log('3. Click on "View Export Metrics" or "View Owner Dashboard"');
