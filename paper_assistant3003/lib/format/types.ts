export type Severity = 'error' | 'warning' | 'info';

export interface FormatIssue {
  type: string;
  line: number;
  severity: Severity;
  message: string;
  suggestion: string;
}
