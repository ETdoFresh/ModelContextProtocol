import { XMLBuilder } from 'fast-xml-parser';
import type { FileData, PackCodebaseOptions } from './fileUtils.js';
import { generateSummaryNotes } from './fileUtils.js';

interface OutputContext {
  directoryStructure: string;
  processedFiles: FileData[];
  options: PackCodebaseOptions; // Use the extended interface
  defaultIgnorePatterns: string[];
  inputIgnorePatterns: string[];
  gitignorePatterns: string[];
}

// Define a structure for the summary content
interface FileSummaryContent {
    intro: string;
    purpose: string;
    file_format: string;
    usage_guidelines: string;
    notes: string;
    additional_info: string;
}

// Generates the <file_summary> content as an object
function generateFileSummaryObject(options: PackCodebaseOptions): FileSummaryContent {
    // Use the reusable function
    const notesList = generateSummaryNotes(options);
    const source = options.sourceIdentifier || options.directory; // Use identifier if available

    return {
        intro: "This section contains a summary of this file.",
        purpose:
`This file contains a packed representation of the selected repository contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.`,
        file_format:
`The content is organized as follows:
1. This summary section
2. Directory structure (if enabled)
3. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file`,
        usage_guidelines:
`- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.`,
        notes: `${notesList.join('\n')}`,
        additional_info: ``
    };
}

export function generateXmlOutput(context: OutputContext): string {
  const {
    directoryStructure,
    processedFiles,
    options,
    defaultIgnorePatterns,
    inputIgnorePatterns,
    gitignorePatterns
  } = context;
  // Use the options from the extended PackCodebaseOptions
  const { fileSummary = true, directoryStructure: includeDirStructure = true } = options;

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: "  ",
    suppressBooleanAttributes: false,
    suppressEmptyNode: true,
    cdataPropName: "__cdata",
  });

  // Helper function to create pattern nodes
  const createPatternNodes = (patterns: string[]) => patterns.map(p => ({ '#text': p }));

  const xmlObject = {
    repopack: {
      description: `This file is a merged representation of the codebase from ${options.sourceIdentifier || options.directory}, combined into a single document by repopack-server.`,
      ...(fileSummary && { file_summary: generateFileSummaryObject(options) }),

      // Conditionally include default ignore patterns
      ...(defaultIgnorePatterns.length > 0 && {
        ignore_global: {
          intro: 'Default patterns used globally to exclude files:',
          pattern: createPatternNodes(defaultIgnorePatterns)
        }
      }),

      // Conditionally include input ignore patterns
      ...(inputIgnorePatterns.length > 0 && {
        ignore_input: {
          intro: 'User-provided patterns used to exclude files:',
          pattern: createPatternNodes(inputIgnorePatterns)
        }
      }),

      ...(includeDirStructure && { directory_structure: directoryStructure }),
      files: {
        file: processedFiles.map((file) => ({
          '@_path': file.path,
          '__cdata': file.content,
        })),
      },
    },
  };

  // The builder might insert XML declaration differently, let's ensure it's at the top.
  const xmlString = builder.build(xmlObject);
  // Manually prepend the XML declaration if builder doesn't handle it as expected
  if (!xmlString.startsWith('<?xml')) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlString}`;
  }
  return xmlString;
} 