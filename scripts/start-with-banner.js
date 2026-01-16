#!/usr/bin/env node
// Updated: January 2026 - Repository sync
const fs = require('fs');
const path = require('path');

// Custom BookYolo banner with logo representation
const createBanner = () => {
  // ASCII art representation of the BookYolo logo (interconnected organic shapes)
  const logoArt = `
         ╭───╮
        ╱     ╲
       │   ●   │
        ╲     ╱
    ╭───╯     ╰───╮
   ╱               ╲
  │       ●         │
   ╲               ╱
    ╰───╮     ╭───╯
        ╲     ╱
         │   ●   │
        ╱     ╲
       ╰───╯
`;

  const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
${logoArt}
║                                                           ║
║                    📚 BookYolo AI 📚                      ║
║                                                           ║
║              Building JavaScript Bundle...               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

  return banner;
};

// Clear console and show banner
console.clear();
console.log('\n');
console.log(createBanner());
console.log('\n');

// Start Expo with the original command
const { spawn } = require('child_process');
const expoStart = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true
});

expoStart.on('close', (code) => {
  process.exit(code);
});
