import type { FileData, PackCodebaseOptions } from './fileUtils.js';
import { generateSummaryNotes } from './fileUtils.js';

// Define the context needed, similar to xmlOutput
interface OutputContext {
  directoryStructure: string;
  processedFiles: FileData[];
  options: PackCodebaseOptions;
  defaultIgnorePatterns: string[];
  inputIgnorePatterns: string[];
  gitignorePatterns: string[];
}

// Placeholder function for Markdown generation
export function generateMarkdownOutput(context: OutputContext): string {
  const {
    directoryStructure,
    processedFiles,
    options,
    defaultIgnorePatterns,
    inputIgnorePatterns,
    gitignorePatterns
  } = context;

  let output = `# Repopack Output: ${options.directory}\n\n`;

  // File Summary section
  if (options.fileSummary) {
    const notes = generateSummaryNotes(options);
    output += `## File Summary\n\n`;
    output += `**Notes:**\n`;
    notes.forEach(note => {
      output += `${note}\n`;
    });
    output += `\n`;
  }

  // Helper function to generate ignore list section
  const generateIgnoreSection = (title: string, intro: string, patterns: string[]) => {
    let section = `## ${title}\n\n${intro}\n\n`;
    if (patterns.length > 0) {
      section += `\`\`\`\n`;
      patterns.forEach(pattern => {
        section += `${pattern}\n`;
      });
      section += `\`\`\`\n`;
    } else {
      section += `_(No patterns in this category)_\n`;
    }
    return section + `\n`;
  };

  // Conditionally include Default Global Ignore Patterns section
  if (defaultIgnorePatterns.length > 0) {
    output += generateIgnoreSection(
      'Default Global Ignore Patterns',
      'Default patterns used globally to exclude files:',
      defaultIgnorePatterns
    );
  }

  // Conditionally include Input Ignore Patterns section
  if (inputIgnorePatterns.length > 0) {
    output += generateIgnoreSection(
      'Input Ignore Patterns',
      'User-provided patterns used to exclude files:',
      inputIgnorePatterns
    );
  }

  // Directory Structure section
  if (options.directoryStructure) {
    output += `## Directory Structure\n\n\`\`\`\n${directoryStructure}\n\`\`\`\n\n`;
  }

  // Files section
  output += `## Files\n\n`;
  processedFiles.forEach(file => {
    output += `### \`${file.path}\`\n\n`;
    output += `\`\`\`\n${file.content}\n\`\`\`\n\n`; // Basic code block, needs language detection later
  });

  console.warn("Markdown output generation is incomplete.");
  return output;
} 