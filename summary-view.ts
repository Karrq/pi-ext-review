/**
 * Summary view - Top-level review overview with section selection
 * Features horizontal scroll animation for long section titles
 */

import { matchesKey } from "@mariozechner/pi-tui";
import type { Review } from "./types.js";

interface SummaryCallbacks {
  onSelect: (index: number) => void;
  onClose: () => void;
}

function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 1) + "...";
}

function wrapText(text: string, width: number, maxLines: number): string[] {
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
        if (currentLine) {
          lines.push(currentLine);
          if (lines.length >= maxLines) return lines;
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
      if (lines.length >= maxLines) return lines;
    }
  }

  return lines;
}

export class SummaryView {
  private selectedSectionIndex: number;
  private horizontalScrollOffset = 0;
  private scrollTimer: ReturnType<typeof setInterval> | null = null;
  private scrollDirection = 1; // 1 for forward, -1 for backward
  
  constructor(
    private review: Review,
    private theme: any,
    private tui: any,
    private callbacks: SummaryCallbacks,
    initialSelection = 0,
  ) {
    this.selectedSectionIndex = Math.max(0, Math.min(initialSelection, review.sections.length - 1));
    this.startScrollTimer();
  }

  private startScrollTimer(): void {
    this.clearTimer();
    this.horizontalScrollOffset = 0;
    this.scrollDirection = 1;
    
    this.scrollTimer = setInterval(() => {
      const section = this.review.sections[this.selectedSectionIndex];
      const fullText = `${section.title} - ${section.explanation}`;
      const visibleWidth = this.tui.screenHeight ? Math.floor(this.tui.screenHeight * 0.8) : 60;
      
      // Calculate max offset (text that doesn't fit)
      const maxOffset = Math.max(0, fullText.length - visibleWidth);

      if (maxOffset === 0) {
        // Text fits, no need to scroll
        this.horizontalScrollOffset = 0;
        return;
      }

      // Advance scroll
      this.horizontalScrollOffset += this.scrollDirection;

      // Bounce at boundaries
      if (this.horizontalScrollOffset >= maxOffset) {
        this.scrollDirection = -1;
        this.horizontalScrollOffset = maxOffset;
      } else if (this.horizontalScrollOffset <= 0) {
        this.scrollDirection = 1;
        this.horizontalScrollOffset = 0;
      }

      this.tui.requestRender();
    }, 100);
  }

  clearTimer(): void {
    if (this.scrollTimer) {
      clearInterval(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  restartTimer(): void {
    this.startScrollTimer();
  }

  render(width: number): string[] {
    const lines: string[] = [];

    // Header
    const headerText = ` Reviewing ${this.review.title} `;
    lines.push(this.theme.fg("accent", this.theme.bold(truncate(headerText, width))));
    
    // Separator
    lines.push(this.theme.fg("dim", "-".repeat(width)));

    // Summary (truncated to 4-6 lines)
    const summaryLines = wrapText(this.review.summary, width - 2, 6);
    for (const line of summaryLines) {
      lines.push(`  ${line}`);
    }
    
    if (this.review.summary.length > width * 6) {
      lines.push(this.theme.fg("dim", "  ..."));
    }

    // Separator
    lines.push(this.theme.fg("dim", "-".repeat(width)));

    // Section list
    for (let i = 0; i < this.review.sections.length; i++) {
      const section = this.review.sections[i];
      const isSelected = i === this.selectedSectionIndex;

      if (isSelected) {
        // Selected item with horizontal scroll
        const fullText = `${section.title} - ${section.explanation}`;
        const scrolledText = fullText.substring(this.horizontalScrollOffset);
        const displayText = truncate(scrolledText, width - 4);
        
        lines.push(this.theme.fg("accent", "> ") + displayText);
      } else {
        // Non-selected item (title only, truncated)
        const displayText = truncate(section.title, width - 4);
        lines.push("  " + displayText);
      }
    }

    // Separator
    lines.push(this.theme.fg("dim", "-".repeat(width)));

    // Help bar
    const helpText = " j/k select  enter view  esc close";
    lines.push(this.theme.fg("dim", helpText));

    return lines;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "j") || matchesKey(data, "down")) {
      if (this.selectedSectionIndex < this.review.sections.length - 1) {
        this.selectedSectionIndex++;
        this.horizontalScrollOffset = 0;
        this.startScrollTimer();
        this.tui.requestRender();
      }
    } else if (matchesKey(data, "k") || matchesKey(data, "up")) {
      if (this.selectedSectionIndex > 0) {
        this.selectedSectionIndex--;
        this.horizontalScrollOffset = 0;
        this.startScrollTimer();
        this.tui.requestRender();
      }
    } else if (matchesKey(data, "return")) {
      this.clearTimer();
      this.callbacks.onSelect(this.selectedSectionIndex);
    } else if (matchesKey(data, "escape") || data === "q") {
      this.clearTimer();
      this.callbacks.onClose();
    }
  }

  invalidate(): void {}
}
