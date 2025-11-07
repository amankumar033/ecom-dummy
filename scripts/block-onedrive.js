#!/usr/bin/env node
const path = require('path');

const cwd = process.cwd();
const lower = cwd.toLowerCase();

// Allow explicit override if you really know what you're doing
if (process.env.SKIP_ONEDRIVE_CHECK === '1') {
  process.exit(0);
}

// Block running from OneDrive or Desktop copy
if (lower.includes('onedrive') || lower.includes('desktop\\')) {
  console.error('\n❌ This project cannot be run from OneDrive or the Desktop copy.');
  console.error('   Detected working directory:', cwd);
  console.error('   Reason: OneDrive locks the .next build files causing UNKNOWN open errors.');
  console.error('\n✅ Please run the project from the non-synced location instead:');
  console.error('   cd C:\\dev\\Easy Commerce-master-main');
  console.error('   npm run dev');
  process.exit(1);
}

// If running from C:\dev, allow
process.exit(0);


