#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { program } from 'commander';

/**
 * Reads include patterns from a file
 */
async function readIncludePatterns(includeFile: string): Promise<string[]> {
    const content = await fs.readFile(includeFile, 'utf8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('+'))
        .map(line => {
            // Remove the + and normalize path separators
            const pattern = line.slice(1).trim();
            return pattern.replace(/\\/g, '/');
        });
}

/**
 * Generates gitignore-style patterns from include patterns
 */
function generateGitignorePatterns(includePatterns: string[]): string[] {
    // Use a Set to prevent duplicates
    const patternSet = new Set<string>();

    // First exclude everything
    patternSet.add('*');

    for (const pattern of includePatterns) {
        const currentParts: string[] = [];
        const parts = pattern.split('/');

        // Handle patterns with or without leading slash
        const isAbsolute = pattern.startsWith('/');
        const processableParts = isAbsolute ? parts.slice(1) : parts;

        // Build up the path parts, creating necessary exceptions
        for (let i = 0; i < processableParts.length; i++) {
            const part = processableParts[i];

            if (i === 0 && !isAbsolute) {
                // For patterns without leading slash, handle any depth
                patternSet.add(`!**/${part}`);
                currentParts.push(part);
            } else {
                const currentPath = currentParts.join('/');
                if (currentPath) {
                    // Allow this directory level
                    patternSet.add(`!${currentPath}/${part}`);
                } else {
                    // Top level directory
                    patternSet.add(`!${part}`);
                }
                currentParts.push(part);
            }

            // Re-exclude everything under this level except our specific inclusions
            if (i < processableParts.length - 1) {
                const currentPath = currentParts.join('/');
                patternSet.add(`${currentPath}/*`);
            }
        }

        // Handle directory patterns (ending with /)
        if (pattern.endsWith('/')) {
            const finalPath = currentParts.join('/');
            patternSet.add(`!${finalPath}/**`); // Changed from !docs//** to !docs/**
        }
    }

    // Convert Set back to array and sort for consistency
    return Array.from(patternSet);
}

/**
 * Writes patterns to the output file
 */
async function writeIgnoreFile(patterns: string[], outputFile: string): Promise<void> {
    const content = [
        '# Generated from include patterns',
        '# Note: More specific rules override less specific ones',
        '',
        ...patterns
    ].join('\n');

    await fs.writeFile(outputFile, content + '\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
    program
        .name('include-to-ignore')
        .description('Converts include patterns to .ignore format')
        .requiredOption('-i, --in <file>', 'input file with include patterns')
        .requiredOption('-o, --out <file>', 'output .ignore file')
        .parse();

    const options = program.opts();

    try {
        const patterns = await readIncludePatterns(options.in);
        const ignorePatterns = generateGitignorePatterns(patterns);
        await writeIgnoreFile(ignorePatterns, options.out);
        console.log(`Successfully converted include patterns to ignore patterns in '${options.out}'`);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Run the program
main();