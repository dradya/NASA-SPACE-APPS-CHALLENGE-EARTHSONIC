// Regenerates docs/SONIFICATION_MAPPINGS.md. Run with: npm run docs
import { writeFileSync } from 'node:fs'
import { renderMappingDocs } from '../src/registry/mappingDocs.ts'

writeFileSync(new URL('../docs/SONIFICATION_MAPPINGS.md', import.meta.url), renderMappingDocs())
console.log('docs/SONIFICATION_MAPPINGS.md regenerated')
