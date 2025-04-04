import { XMLBuilder } from 'fast-xml-parser';
import type { FileData, PackCodebaseOptions } from './fileUtils.js';

interface OutputContext {
  directoryStructure: string;
  processedFiles: FileData[];
  options: PackCodebaseOptions; // Use the extended interface
}

// Generates the <file_summary> content
function generateFileSummary(options: PackCodebaseOptions): string {
    const notes = [
        "- Some files may have been excluded based on ignore rules.",
        "- Binary files and files larger than 5MB are not included.",
        options.useGitignore ? "- Files matching patterns in .gitignore are excluded." : "- .gitignore rules were not used.",
        options.useDefaultPatterns ? "- Files matching default ignore patterns are excluded." : "- Default ignore patterns were not used.",
        options.removeComments ? "- Code comments have been removed from supported file types." : "",
        options.removeEmptyLines ? "- Empty lines have been removed." : "",
    ].filter(Boolean).join('\n');

    return `
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the selected repository contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Directory structure (if enabled)
3. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
${notes}
</notes>

<additional_info>
Packed from directory: ${options.directory}
</additional_info>
    `.trim();
}

export function generateXmlOutput(context: OutputContext): string {
  const { directoryStructure, processedFiles, options } = context;
  // Use the options from the extended PackCodebaseOptions
  const { fileSummary = true, directoryStructure: includeDirStructure = true } = options;

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true, // Pretty print the XML
    suppressBooleanAttributes: false,
    suppressEmptyNode: true, // Remove empty tags like <additional_info/> if headerText is missing
  });

  const xmlObject = {
    repomix: { // Using 'repomix' root tag as per the example format provided
      '?xml-declaration': { '@_version': '1.0', '@_encoding': 'UTF-8' },
      '#text': `This file is a merged representation of the codebase in ${options.directory}, combined into a single document by repopack-server.`,
      ...(fileSummary && { file_summary: generateFileSummary(options) }),
      ...(includeDirStructure && { directory_structure: directoryStructure }),
      files: {
        '#text': "This section contains the contents of the repository's files.",
        file: processedFiles.map((file) => ({
          '@_path': file.path,
          '#text': file.content,
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