export interface CodeBlock {
  lang: string;
  path: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface NarrativeSection {
  title: string;
  explanation: string;
  codeBlocks: CodeBlock[];
  note?: string;
}

export interface Review {
  title: string;
  summary: string;
  sections: NarrativeSection[];
}
