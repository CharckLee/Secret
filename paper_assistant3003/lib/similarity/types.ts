export interface SentenceUnit {
  index: number;
  text: string;
}

export interface MatchPair {
  aIndex: number;
  bIndex: number;
  semantic: number; // 0-1 语义余弦
  lexical: number;  // 0-1 字面 Dice
  score: number;    // 0-1 加权
}

export interface Segment {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  score: number;
}
