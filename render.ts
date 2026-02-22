import type { Review, NarrativeSection, CodeBlock } from './types.js';

export function renderReviewAsMarkdown(review: Review): string {
  const parts: string[] = [];

  // Render title if present
  if (review.title) {
    parts.push(`# ${review.title}\n\n`);
  }

  // Render summary
  parts.push('## Summary\n');
  parts.push(review.summary);
  parts.push('\n');

  // Render each section
  for (const section of review.sections) {
    parts.push(`\n### ${section.title}\n`);
    parts.push(`${section.explanation}\n`);

    // Render code blocks
    for (const codeBlock of section.codeBlocks) {
      parts.push(`\n\`\`\`${codeBlock.lang}`);
      parts.push(`\n// ${codeBlock.path}:${codeBlock.startLine}-${codeBlock.endLine}`);
      parts.push(`\n${codeBlock.code}`);
      parts.push('\n```\n');
    }

    // Render optional note
    if (section.note) {
      parts.push(`\n${section.note}\n`);
    }

    // Separator between sections (not after last)
    if (section !== review.sections[review.sections.length - 1]) {
      parts.push('\n---\n');
    }
  }

  return parts.join('');
}
