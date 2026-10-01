export interface TrendPoint {
  month: string;
  volume: number;
}

export type CompetitionLevel = 'Low' | 'Medium' | 'High';

export interface RelatedKeyword {
  keyword: string;
  volume: number;
  competition: CompetitionLevel;
  cpc: number;
  ctr: number;
}

export interface TagSuggestion {
  keyword: string;
  volume: number;
  competition: CompetitionLevel;
}

export interface MarketLeader {
  title: string;
  shopName: string;
  price: number;
  signal: string;
  badges: string[];
  reviewCount: number | null;
  reportedSales: number | null;
}

export interface DataSource {
  title: string;
  uri: string;
}

export interface KeywordAnalysis {
  keyword: string;
  score: number;
  searchVolumeLabel: string;
  competitionLabel: string;
  summary: string;
  trendData: TrendPoint[];
  relatedKeywords: RelatedKeyword[];
  tagSuggestions: TagSuggestion[];
  marketLeaders: MarketLeader[];
  generatedTitles: string[];
  sources: DataSource[];
}

export type Page = 'explorer' | 'listing-auditor' | 'compare' | 'rank-tracker' | 'shop-teardown';

export type IssueSeverity = 'good' | 'warning' | 'critical';

export interface AuditIssue {
  severity: IssueSeverity;
  message: string;
}

export interface ListingAudit {
  url: string;
  currentTitle: string;
  currentTags: string[];
  overallScore: number;
  titleScore: number;
  tagsScore: number;
  titleIssues: AuditIssue[];
  tagIssues: AuditIssue[];
  missingKeywords: string[];
  suggestedTitle: string;
  suggestedTags: string[];
  summary: string;
  sources: DataSource[];
}

export interface ShopListingSample {
  title: string;
  price: number;
  signal: string;
  badges: string[];
  reviewCount: number | null;
  reportedSales: number | null;
}

export interface ShopTeardown {
  shopInput: string;
  shopName: string;
  estimatedNiche: string;
  commonKeywordThemes: string[];
  titlePatternInsights: string[];
  listings: ShopListingSample[];
  summary: string;
  sources: DataSource[];
}
