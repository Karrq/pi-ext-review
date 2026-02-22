/**
 * Walkthrough view - Detail view for a single review section
 * Shows explanation text and code blocks with vertical scrolling
 */

import { matchesKey } from "@mariozechner/pi-tui";
import type { Review } from "./types.js";

interface WalkthroughCallbacks {
  onBack: () => void;
  onClose: () => void;
}

function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 1) + "...";
}

function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      if (!word) continue;
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

interface ContentLine {
  text: string;
  isCode: boolean;
}

export class WalkthroughView {
  private scrollOffset = 0;
  private horizontalOffset = 0;
  private contentLines: ContentLine[] = [];
  
  constructor(
    private review: Review,
    private sectionIndex: number,
    private theme: any,
    private tui: any,
    private callbacks: WalkthroughCallbacks,
  ) {}

  render(width: number): string[] {
    const lines: string[] = [];
    const section = this.review.sections[this.sectionIndex];
    const idx = this.sectionIndex;
    const total = this.review.sections.length;

    // Header
    const headerText = ` Reviewing ${this.review.title} - ${section.title} [${idx + 1}/${total}] `;
    lines.push(this.theme.fg("accent", this.theme.bold(truncate(headerText, width))));
    
    // Separator
    lines.push(this.theme.fg("dim", "-".repeat(width)));

    // Build content zone (explanation + code blocks)
    this.contentLines = [];

    // Explanation text (word-wrapped)
    const wrappedExplanation = wrapText(section.explanation, width - 2);
    for (const line of wrappedExplanation) {
      this.contentLines.push({ text: `  ${line}`, isCode: false });
    }

    // Blank line
    this.contentLines.push({ text: "", isCode: false });

    // Code blocks
    for (let i = 0; i < section.codeBlocks.length; i++) {
      const cb = section.codeBlocks[i];
      
      // File path header
      const fileHeader = ` ${cb.path}:${cb.startLine}-${cb.endLine} `;
      this.contentLines.push({ text: this.theme.fg("dim", fileHeader), isCode: false });

      // Code lines
      const codeLines = cb.code.split("\n");
      for (const codeLine of codeLines) {
        this.contentLines.push({ text: codeLine, isCode: true });
      }

      // Divider between code blocks (not after the last one)
      if (i < section.codeBlocks.length - 1) {
        this.contentLines.push({ text: "-".repeat(width), isCode: false });
      } else {
        this.contentLines.push({ text: "", isCode: false });
      }
    }

    // Optional note
    if (section.note) {
      this.contentLines.push({ text: this.theme.fg("dim", "Note: " + section.note), isCode: false });
      this.contentLines.push({ text: "", isCode: false });
    }

    // Calculate visible area
    const headerHeight = 2; // header + separator
    const footerHeight = 1; // help bar
    const availableHeight = this.tui.screenHeight - headerHeight - footerHeight;

    // Apply scroll offset and slice visible content
    const visibleContent = this.contentLines.slice(
      this.scrollOffset,
      this.scrollOffset + availableHeight,
    );

    // Find first visible code line for cursor highlight
    let firstCodeLineIndex = -1;
    for (let i = 0; i < visibleContent.length; i++) {
      if (visibleContent[i].isCode) {
        firstCodeLineIndex = i;
        break;
      }
    }

    // Render visible content with horizontal scroll and highlight
    for (let i = 0; i < visibleContent.length; i++) {
      const contentLine = visibleContent[i];
      let renderedLine = "";

      if (contentLine.isCode) {
        // Apply horizontal offset to code lines
        const scrolledLine = contentLine.text.substring(this.horizontalOffset);
        const truncatedLine = truncate(scrolledLine, width);
        
        // Apply dim styling and highlight if first code line
        if (i === firstCodeLineIndex) {
          renderedLine = this.theme.bg("highlight", this.theme.fg("dim", truncatedLine));
        } else {
          renderedLine = this.theme.fg("dim", truncatedLine);
        }
      } else {
        // Non-code lines: check if it's a divider
        if (contentLine.text.startsWith("-") && contentLine.text.trim().replace(/-/g, "") === "") {
          renderedLine = this.theme.fg("dim", contentLine.text);
        } else {
          renderedLine = contentLine.text;
        }
      }

      lines.push(renderedLine);
    }

    // Pad to fill screen
    while (lines.length < this.tui.screenHeight - footerHeight) {
      lines.push("");
    }

    // Help bar at bottom
    const helpText = " j/k scroll  h/l scroll horiz  esc back  q close";
    lines.push(this.theme.fg("dim", helpText));

    return lines;
  }

  handleInput(data: string): void {
    const headerHeight = 2;
    const footerHeight = 1;
    const availableHeight = this.tui.screenHeight - headerHeight - footerHeight;
    const maxScroll = Math.max(0, this.contentLines.length - availableHeight);

    if (matchesKey(data, "j") || matchesKey(data, "down")) {
      this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
      this.tui.requestRender();
    } else if (matchesKey(data, "k") || matchesKey(data, "up")) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      this.tui.requestRender();
    } else if (matchesKey(data, "l") || matchesKey(data, "right")) {
      this.horizontalOffset = this.horizontalOffset + 1;
      this.tui.requestRender();
    } else if (matchesKey(data, "h") || matchesKey(data, "left")) {
      this.horizontalOffset = Math.max(0, this.horizontalOffset - 1);
      this.tui.requestRender();
    } else if (matchesKey(data, "escape")) {
      this.callbacks.onBack();
    } else if (data === "q") {
      this.callbacks.onClose();
    }
  }

  invalidate(): void {}
}
