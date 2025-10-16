#!/usr/bin/env node

import { 
  computeCoverage, 
  buildSegmentArchetypeFormatMatrix, 
  enforceCaps, 
  generateAssetsManifest 
} from '../services/exporter/dist/index.js';

// Seeded demo data for testing coverage ≥80%
const demoAssets = [
  // Segment 1: problem-solution archetype
  { asset_id: 'asset-001', segment_id: 'segment-1', archetype: 'problem-solution', hook_id: 'hook-001', ratio: '9:16', variant: 'v1', filename: 'seg1-prob-9x16-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1920 } },
  { asset_id: 'asset-002', segment_id: 'segment-1', archetype: 'problem-solution', hook_id: 'hook-001', ratio: '1:1', variant: 'v1', filename: 'seg1-prob-1x1-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1080 } },
  { asset_id: 'asset-003', segment_id: 'segment-1', archetype: 'problem-solution', hook_id: 'hook-001', ratio: '4:5', variant: 'v1', filename: 'seg1-prob-4x5-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1350 } },
  { asset_id: 'asset-004', segment_id: 'segment-1', archetype: 'problem-solution', hook_id: 'hook-001', ratio: '16:9', variant: 'v1', filename: 'seg1-prob-16x9-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1920, height: 1080 } },
  
  // Segment 1: ugc archetype
  { asset_id: 'asset-005', segment_id: 'segment-1', archetype: 'ugc', hook_id: 'hook-002', ratio: '9:16', variant: 'v1', filename: 'seg1-ugc-9x16-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1920 } },
  { asset_id: 'asset-006', segment_id: 'segment-1', archetype: 'ugc', hook_id: 'hook-002', ratio: '1:1', variant: 'v1', filename: 'seg1-ugc-1x1-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1080 } },
  
  // Segment 2: demo archetype
  { asset_id: 'asset-007', segment_id: 'segment-2', archetype: 'demo', hook_id: 'hook-003', ratio: '9:16', variant: 'v1', filename: 'seg2-demo-9x16-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1920 } },
  { asset_id: 'asset-008', segment_id: 'segment-2', archetype: 'demo', hook_id: 'hook-003', ratio: '1:1', variant: 'v1', filename: 'seg2-demo-1x1-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1080 } },
  { asset_id: 'asset-009', segment_id: 'segment-2', archetype: 'demo', hook_id: 'hook-003', ratio: '4:5', variant: 'v1', filename: 'seg2-demo-4x5-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1350 } },
  { asset_id: 'asset-010', segment_id: 'segment-2', archetype: 'demo', hook_id: 'hook-003', ratio: '16:9', variant: 'v1', filename: 'seg2-demo-16x9-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1920, height: 1080 } },
  
  // Segment 2: offer archetype
  { asset_id: 'asset-011', segment_id: 'segment-2', archetype: 'offer', hook_id: 'hook-004', ratio: '9:16', variant: 'v1', filename: 'seg2-offer-9x16-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1920 } },
  { asset_id: 'asset-012', segment_id: 'segment-2', archetype: 'offer', hook_id: 'hook-004', ratio: '1:1', variant: 'v1', filename: 'seg2-offer-1x1-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1080 } },
  
  // Segment 3: founder archetype
  { asset_id: 'asset-013', segment_id: 'segment-3', archetype: 'founder', hook_id: 'hook-005', ratio: '9:16', variant: 'v1', filename: 'seg3-founder-9x16-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1920 } },
  { asset_id: 'asset-014', segment_id: 'segment-3', archetype: 'founder', hook_id: 'hook-005', ratio: '1:1', variant: 'v1', filename: 'seg3-founder-1x1-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1080 } },
  { asset_id: 'asset-015', segment_id: 'segment-3', archetype: 'founder', hook_id: 'hook-005', ratio: '4:5', variant: 'v1', filename: 'seg3-founder-4x5-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1080, height: 1350 } },
  { asset_id: 'asset-016', segment_id: 'segment-3', archetype: 'founder', hook_id: 'hook-005', ratio: '16:9', variant: 'v1', filename: 'seg3-founder-16x9-v1.png', checksum: '', license_tag: 'generated', created_at: '2024-01-01T00:00:00Z', file_size: 1024, dimensions: { width: 1920, height: 1080 } },
];

console.log('M5D Exporter Demo - Coverage + Caps + Manifest');
console.log('===============================================');

// Test coverage computation
console.log('\n1. Coverage Computation:');
const coverage = computeCoverage(demoAssets);
console.log(`   Total Segments: ${coverage.totalSegments}`);
console.log(`   Total Archetypes: ${coverage.totalArchetypes}`);
console.log(`   Total Formats: ${coverage.totalFormats}`);
console.log(`   Segment Coverage: ${(coverage.segmentCoverage * 100).toFixed(1)}%`);
console.log(`   Archetype Coverage: ${(coverage.archetypeCoverage * 100).toFixed(1)}%`);
console.log(`   Format Coverage: ${(coverage.formatCoverage * 100).toFixed(1)}%`);
console.log(`   Overall Coverage: ${(coverage.overallCoverage * 100).toFixed(1)}%`);

// Test caps enforcement
console.log('\n2. Caps Enforcement:');
const capsResult = enforceCaps(demoAssets);
console.log(`   Caps OK: ${capsResult.ok}`);
if (!capsResult.ok) {
  console.log('   Violations:');
  capsResult.violations.forEach(violation => console.log(`     - ${violation}`));
}

// Test segment×archetype×format matrix
console.log('\n3. Segment×Archetype×Format Matrix:');
const matrix = buildSegmentArchetypeFormatMatrix(demoAssets);
for (const [segmentId, archetypes] of Object.entries(matrix)) {
  console.log(`   ${segmentId}:`);
  for (const [archetype, formats] of Object.entries(archetypes)) {
    console.log(`     ${archetype}:`);
    for (const [format, count] of Object.entries(formats)) {
      console.log(`       ${format}: ${count} assets`);
    }
  }
}

// Generate assets manifest
console.log('\n4. Assets Manifest Generation:');
const manifest = generateAssetsManifest('demo-run-001', demoAssets);
console.log(`   Filename: ${manifest.filename}`);
console.log(`   Body length: ${manifest.body.length} characters`);

// Verify coverage target
console.log('\n5. Coverage Target Verification:');
const targetMet = coverage.overallCoverage >= 0.8;
console.log(`   Target (≥80%): ${targetMet ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`   Actual: ${(coverage.overallCoverage * 100).toFixed(1)}%`);

console.log('\nDemo completed successfully!');
