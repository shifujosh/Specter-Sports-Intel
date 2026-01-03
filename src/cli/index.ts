#!/usr/bin/env node
/**
 * Specter CLI - Sports Intelligence Command Line Interface
 * 
 * This is the public demo interface for the Specter analysis engine.
 * Core analytics and proprietary logic are not included.
 */

import { Command } from 'commander';
import { runDemo } from './demo-agent.js';

const program = new Command();

program
  .name('specter')
  .description('Specter Sports Intelligence CLI - Demo Mode')
  .version('1.0.0');

program
  .command('demo')
  .description('Run a full demo analysis workflow with mock data')
  .option('--league <league>', 'Target league (nba/nfl)', 'nba')
  .option('--date <date>', 'Target date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--verbose', 'Show detailed output')
  .action(async (options: { league: string; date: string; verbose?: boolean }) => {
    await runDemo(options);
  });

program
  .command('analyze')
  .description('Analyze games for a specific date (demo mode)')
  .option('--date <date>', 'Target date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--league <league>', 'Target league', 'nba')
  .action(async (options: { league: string; date: string }) => {
    await runDemo({ ...options, verbose: true });
  });

program
  .command('info')
  .description('Show system information')
  .action(() => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    SPECTER SPORTS INTELLIGENCE                    ║
║                         Demo Mode v1.0.0                          ║
╠══════════════════════════════════════════════════════════════════╣
║  This CLI demonstrates the Specter analysis workflow:            ║
║                                                                  ║
║  1. RECONNAISSANCE - Fetch game data from multiple sources       ║
║  2. ANALYSIS       - Run ensemble voting (Elo + Rules + Bayes)   ║
║  3. VERIFICATION   - Fact-check against ground truth             ║
║  4. SIGNAL         - Generate actionable recommendation          ║
║  5. OUTPUT         - Create visual assets and social posts       ║
║                                                                  ║
║  The full production system includes:                            ║
║  - Real-time odds ingestion                                      ║
║  - LLM-powered analysis with Gemini 2.5                          ║
║  - Automated Twitter/Discord posting                             ║
║  - Visual card generation with Puppeteer                         ║
║                                                                  ║
║  This demo uses mock data to showcase the architecture.          ║
╚══════════════════════════════════════════════════════════════════╝
`);
  });

// Default to help if no command
program.action(() => {
  program.help();
});

program.parse();
