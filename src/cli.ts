#!/usr/bin/env node

import { Command } from 'commander';
import { JiraToShortcutMigrator } from './migrator';
import { JiraToClickUpMigrator } from './clickup-migrator';
import { loadConfig, validateConfig, createEnvFile } from './config';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';

interface MigrateOptions {
  dryRun?: boolean;
  iteration?: string;
  currentIteration?: boolean;
  list?: string;
  parent?: string;
  forceUpdate?: boolean;
}

interface BulkOptions {
  keys?: string[];
  file?: string;
  dryRun?: boolean;
  iteration?: string;
  currentIteration?: boolean;
  list?: string;
  parent?: string;
  forceUpdate?: boolean;
}

const program = new Command();

program
  .name('jira-migration-tool')
  .description('CLI tool for migrating JIRA items to Shortcut.com or ClickUp')
  .version('1.0.0');

program
  .command('setup')
  .description('Setup configuration file')
  .action(async () => {
    console.log(chalk.blue('Setting up configuration...'));
    createEnvFile();
  });

program
  .command('migrate')
  .description('Migrate a single JIRA issue to Shortcut or ClickUp')
  .argument('<jira-key>', 'JIRA issue key (e.g., PROJ-123)')
  .option('-d, --dry-run', 'Show what would be migrated without actually doing it')
  .option('-i, --iteration <id>', 'Assign to specific iteration by ID (Shortcut only)')
  .option('-c, --current-iteration', 'Assign to current iteration (Shortcut only)')
  .option('-l, --list <id>', 'Assign to specific list by ID (ClickUp only)')
  .option('-p, --parent <id>', 'Assign to parent task by ID (ClickUp only)')
  .option('-u, --only-update', 'Only updates existing task, dont create new ones (skip if not found, ClickUp only)')
  .action(async (jiraKey: string, options: MigrateOptions) => {
    try {
      const config = loadConfig();
      const configErrors = validateConfig(config);
      
      if (configErrors.length > 0) {
        console.log(chalk.red('Configuration errors:'));
        configErrors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        console.log(chalk.yellow('\nRun "jira-migration-tool setup" to create configuration file'));
        process.exit(1);
      }

      const targetPlatform = config.targetPlatform || 'shortcut';
      console.log(chalk.blue(`Target platform: ${targetPlatform.toUpperCase()}`));

      if (targetPlatform === 'clickup') {
        // ClickUp migration
        const migrator = new JiraToClickUpMigrator(config);
        
        const spinner = ora('Validating connections...').start();
        const connections = await migrator.validateConnections();
        
        if (!connections.jira) {
          spinner.fail('Failed to connect to JIRA');
          process.exit(1);
        }
        
        if (!connections.clickup) {
          spinner.fail('Failed to connect to ClickUp');
          process.exit(1);
        }
        
        spinner.succeed('Connections validated');

        if (options.dryRun) {
          console.log(chalk.yellow(`[DRY RUN] Would migrate JIRA issue: ${jiraKey}`));
          if (options.list) {
            console.log(chalk.yellow(`[DRY RUN] Would assign to list: ${options.list}`));
          }
          if (options.parent) {
            console.log(chalk.yellow(`[DRY RUN] Would assign to parent task: ${options.parent}`));
          }
          return;
        }

        const migrationSpinner = ora(`Migrating ${jiraKey}...`).start();
        const result = await migrator.migrateIssue(jiraKey, options.list, options.parent, options.forceUpdate);
        
        if (result.success) {
          migrationSpinner.succeed(`Successfully migrated ${jiraKey}`);
          console.log(chalk.green(`ClickUp URL: ${result.clickupUrl}`));
          if (result.wasUpdate) {
            console.log(chalk.blue(`(Updated existing task)`));
          }
        } else {
          migrationSpinner.fail(`Failed to migrate ${jiraKey}`);
          console.log(chalk.red(`Error: ${result.error}`));
        }
      } else {
        // Shortcut migration (existing code)
        const migrator = new JiraToShortcutMigrator(config);
        
        const spinner = ora('Validating connections...').start();
        const connections = await migrator.validateConnections();
        
        if (!connections.jira) {
          spinner.fail('Failed to connect to JIRA');
          process.exit(1);
        }
        
        if (!connections.shortcut) {
          spinner.fail('Failed to connect to Shortcut');
          process.exit(1);
        }
        
        spinner.succeed('Connections validated');

        // Handle iteration options
        let iterationId: number | undefined;
        if (options.currentIteration) {
          const currentIter = await migrator.getCurrentIteration();
          if (currentIter) {
            iterationId = currentIter.id;
            console.log(chalk.blue(`Using current iteration: ${currentIter.name}`));
          } else {
            console.log(chalk.yellow('Warning: No current iteration found'));
          }
        } else if (options.iteration) {
          iterationId = parseInt(options.iteration, 10);
          console.log(chalk.blue(`Using iteration ID: ${iterationId}`));
        }

        if (options.dryRun) {
          console.log(chalk.yellow(`[DRY RUN] Would migrate JIRA issue: ${jiraKey}`));
          if (iterationId) {
            console.log(chalk.yellow(`[DRY RUN] Would assign to iteration: ${iterationId}`));
          }
          return;
        }

        const migrationSpinner = ora(`Migrating ${jiraKey}...`).start();
        const result = await migrator.migrateIssue(jiraKey, iterationId);
        
        if (result.success) {
          migrationSpinner.succeed(`Successfully migrated ${jiraKey}`);
          console.log(chalk.green(`Shortcut URL: ${result.shortcutUrl}`));
          if (iterationId) {
            console.log(chalk.blue(`Assigned to iteration: ${iterationId}`));
          }
        } else {
          migrationSpinner.fail(`Failed to migrate ${jiraKey}`);
          console.log(chalk.red(`Error: ${result.error}`));
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('bulk')
  .description('Migrate multiple JIRA issues to Shortcut or ClickUp')
  .option('-k, --keys <keys...>', 'JIRA issue keys (e.g., PROJ-123 PROJ-124)')
  .option('-f, --file <file>', 'File containing JIRA keys (one per line)')
  .option('-d, --dry-run', 'Show what would be migrated without actually doing it')
  .option('-i, --iteration <id>', 'Assign to specific iteration by ID (Shortcut only)')
  .option('-c, --current-iteration', 'Assign to current iteration (Shortcut only)')
  .option('-l, --list <id>', 'Assign to specific list by ID (ClickUp only)')
  .option('-p, --parent <id>', 'Assign to parent task by ID (ClickUp only)')
  .option('-u, --force-update', 'Force update existing tasks only (skip if not found, ClickUp only)')
  .action(async (options: BulkOptions) => {
    try {
      let jiraKeys: string[] = [];
      
      if (options.keys) {
        jiraKeys = options.keys;
      } else if (options.file) {
        if (!fs.existsSync(options.file)) {
          console.log(chalk.red(`File not found: ${options.file}`));
          return;
        }
        const content = fs.readFileSync(options.file, 'utf-8');
        jiraKeys = content.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line && !line.startsWith('#'));
      } else {
        console.log(chalk.red('Please provide JIRA keys using --keys or --file option'));
        console.log('Example: yarn dev bulk --keys PROJ-123 PROJ-124');
        console.log('Example: yarn dev bulk --file jira-keys.txt');
        return;
      }

      if (jiraKeys.length === 0) {
        console.log(chalk.red('No JIRA keys found'));
        return;
      }

      const config = loadConfig();
      const configErrors = validateConfig(config);
      
      if (configErrors.length > 0) {
        console.log(chalk.red('Configuration errors:'));
        configErrors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        console.log(chalk.yellow('\nRun "jira-migration-tool setup" to create configuration file'));
        process.exit(1);
      }

      const targetPlatform = config.targetPlatform || 'shortcut';
      console.log(chalk.blue(`Target platform: ${targetPlatform.toUpperCase()}`));

      if (options.dryRun) {
        console.log(chalk.yellow('[DRY RUN] Would migrate the following JIRA issues:'));
        jiraKeys.forEach(key => console.log(chalk.yellow(`  - ${key}`)));
        if (targetPlatform === 'shortcut' && options.iteration) {
          console.log(chalk.yellow(`[DRY RUN] Would assign to iteration: ${options.iteration}`));
        }
        if (targetPlatform === 'clickup' && options.list) {
          console.log(chalk.yellow(`[DRY RUN] Would assign to list: ${options.list}`));
        }
        if (targetPlatform === 'clickup' && options.parent) {
          console.log(chalk.yellow(`[DRY RUN] Would assign to parent task: ${options.parent}`));
        }
        return;
      }

      if (targetPlatform === 'clickup') {
        // ClickUp bulk migration
        const migrator = new JiraToClickUpMigrator(config);

        const spinner = ora('Validating connections...').start();
        const connections = await migrator.validateConnections();
        
        if (!connections.jira || !connections.clickup) {
          spinner.fail('Failed to validate connections');
          process.exit(1);
        }
        
        spinner.succeed('Connections validated');

        console.log(chalk.blue(`\nMigrating ${jiraKeys.length} issues...\n`));

        const results = await migrator.migrateBulk(jiraKeys, options.list, options.parent, options.forceUpdate);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(chalk.green(`\n✅ Successfully migrated: ${successful.length}/${results.length}`));
        successful.forEach(result => {
          console.log(chalk.green(`  - ${result.jiraKey} → ${result.clickupUrl}${result.wasUpdate ? ' (updated)' : ''}`));
        });

        if (failed.length > 0) {
          console.log(chalk.red(`\n❌ Failed to migrate: ${failed.length}/${results.length}`));
          failed.forEach(result => {
            console.log(chalk.red(`  - ${result.jiraKey}: ${result.error}`));
          });
        }
      } else {
        // Shortcut bulk migration
        const migrator = new JiraToShortcutMigrator(config);

        // Handle iteration options
        let iterationId: number | undefined;
        if (options.currentIteration) {
          const currentIter = await migrator.getCurrentIteration();
          if (currentIter) {
            iterationId = currentIter.id;
            console.log(chalk.blue(`Using current iteration: ${currentIter.name}`));
          } else {
            console.log(chalk.yellow('Warning: No current iteration found'));
          }
        } else if (options.iteration) {
          iterationId = parseInt(options.iteration, 10);
          console.log(chalk.blue(`Using iteration ID: ${iterationId}`));
        }

        const spinner = ora('Validating connections...').start();
        const connections = await migrator.validateConnections();
        
        if (!connections.jira || !connections.shortcut) {
          spinner.fail('Failed to validate connections');
          process.exit(1);
        }
        
        spinner.succeed('Connections validated');

        console.log(chalk.blue(`\nMigrating ${jiraKeys.length} issues...\n`));

        const results = await migrator.migrateBulk(jiraKeys, iterationId);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(chalk.green(`\n✅ Successfully migrated: ${successful.length}/${results.length}`));
        successful.forEach(result => {
          console.log(chalk.green(`  - ${result.jiraKey} → ${result.shortcutUrl}`));
        });

        if (failed.length > 0) {
          console.log(chalk.red(`\n❌ Failed to migrate: ${failed.length}/${results.length}`));
          failed.forEach(result => {
            console.log(chalk.red(`  - ${result.jiraKey}: ${result.error}`));
          });
        }
      }

    } catch (error: any) {
      console.log(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Inspect a JIRA issue to see its type and details')
  .argument('<jira-key>', 'JIRA issue key (e.g., PROJ-123)')
  .action(async (jiraKey: string) => {
    try {
      const config = loadConfig();
      const configErrors = validateConfig(config);
      
      if (configErrors.length > 0) {
        console.log(chalk.red('Configuration errors:'));
        configErrors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        process.exit(1);
      }

      const migrator = new JiraToShortcutMigrator(config);
      const spinner = ora('Fetching JIRA issue...').start();
      
      const issue = await migrator.inspectIssue(jiraKey);
      
      if (issue) {
        spinner.succeed('JIRA issue fetched');
        console.log(chalk.blue('\n=== JIRA Issue Details ==='));
        console.log(chalk.white(`Key: ${issue.key}`));
        console.log(chalk.white(`Summary: ${issue.fields.summary}`));
        console.log(chalk.white(`Type: ${issue.fields.issuetype.name}`));
        console.log(chalk.white(`Status: ${issue.fields.status.name}`));
        if (issue.fields.assignee) {
          console.log(chalk.white(`Assignee: ${issue.fields.assignee.displayName}`));
        }
        if (issue.fields.labels.length > 0) {
          console.log(chalk.white(`Labels: ${issue.fields.labels.join(', ')}`));
        }
        console.log(chalk.white(`Created: ${new Date(issue.fields.created).toLocaleString()}`));
        console.log(chalk.white(`Updated: ${new Date(issue.fields.updated).toLocaleString()}`));
        
        // Show what it would be migrated as
        const issueType = issue.fields.issuetype.name;
        console.log(chalk.yellow(`\n→ Would be migrated as: ${issueType === 'Epic' ? 'EPIC' : 'STORY'}`));
      } else {
        spinner.fail('Failed to fetch JIRA issue');
      }
    } catch (error: any) {
      console.log(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test connections to JIRA and Shortcut')
  .action(async () => {
    try {
      const config = loadConfig();
      const configErrors = validateConfig(config);
      
      if (configErrors.length > 0) {
        console.log(chalk.red('Configuration errors:'));
        configErrors.forEach(error => console.log(chalk.red(`  - ${error}`)));
        console.log(chalk.yellow('\nRun "jira-to-shortcut setup" to create configuration file'));
        process.exit(1);
      }

      const migrator = new JiraToShortcutMigrator(config);
      
      const spinner = ora('Testing connections...').start();
      const connections = await migrator.validateConnections();
      
      if (connections.jira) {
        console.log(chalk.green('JIRA connection: ✅'));
      } else {
        console.log(chalk.red('JIRA connection: ❌'));
      }
      
      if (connections.shortcut) {
        console.log(chalk.green('Shortcut connection: ✅'));
      } else {
        console.log(chalk.red('Shortcut connection: ❌'));
      }
      
      spinner.stop();

      if (connections.jira && connections.shortcut) {
        console.log(chalk.green('\n🎉 All connections working!'));
      } else {
        console.log(chalk.red('\n❌ Some connections failed. Please check your configuration.'));
        process.exit(1);
      }
    } catch (error: any) {
      console.log(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  program.help();
}

program.parse();