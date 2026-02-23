#!/usr/bin/env node
// Bundle the OpenAPI spec into a single file for orval
import SwaggerParser from '@apidevtools/swagger-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(__dirname, '../server/api/openapi.yaml');
const outputPath = resolve(__dirname, '../server/api/openapi.bundled.json');

try {
  const api = await SwaggerParser.bundle(inputPath);
  writeFileSync(outputPath, JSON.stringify(api, null, 2));
  console.log(`✅ Bundled spec written to ${outputPath}`);
} catch (err) {
  console.error('❌ Failed to bundle spec:', err.message);
  process.exit(1);
}
