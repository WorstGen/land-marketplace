// build-fix.js - Patch for Node.js 22 compatibility
const fs = require('fs');
const path = require('path');

// Fix the ajv-keywords module path issue
const ajvKeywordsPath = path.join(process.cwd(), 'node_modules', 'ajv-keywords', 'dist', 'definitions', 'typeof.js');

if (fs.existsSync(ajvKeywordsPath)) {
  let content = fs.readFileSync(ajvKeywordsPath, 'utf8');
  content = content.replace(
    `require("ajv/dist/compile/codegen")`,
    `require("ajv/lib/compile/codegen")`
  );
  fs.writeFileSync(ajvKeywordsPath, content);
  console.log('✅ Patched ajv-keywords for Node.js 22 compatibility');
} else {
  console.log('⚠️  ajv-keywords file not found, skipping patch');
}
