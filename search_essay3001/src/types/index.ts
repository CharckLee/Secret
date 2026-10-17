// 文献类型（匹配数据库Schema）
export interface LiteratureData {
  id: number;
  title: string;
  author: string | null;
  abstract: string | null;
  content: string | null;
  keywords: string | null;
  pdfPath: string | null;
  journalSource: string | null;
  journalUrl: string | null;
  aiAnalysis: string | null;
  aiOverview: string | null;
  translatedContent: string | null;
  createTime: string | Date;
  updateTime: string | Date;
  tags: TagData[];
  notes: NoteData[];
}

// 笔记类型
export interface NoteData {
  id: number;
  content: string;
  createTime: string;
  literatureId: number;
}

// 标签类型
export interface TagData {
  id: number;
  name: string;
  color: string;
}

// AI 结构化精读结果
export interface AIStructuredReading {
  chineseAbstract: string;
  keywords: string[];
  researchPurpose: string;
  methods: string;
  innovation: string;
  limitations: string;
  conclusion: string;
}

// AI 多维度对比结果
export interface AICompareResult {
  dimensions: {
    name: string;
    perDoc: {
      literatureId: number;
      content: string;
    }[];
  }[];
}

// 关键词检索结果
export interface KeywordSearchResult {
  literatureId: number;
  title: string;
  summary: string;
}

// 文献列表响应（分页）
export interface LiteratureListResponse {
  items: LiteratureData[];
  total: number;
}
