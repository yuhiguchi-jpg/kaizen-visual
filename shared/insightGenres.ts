export const INSIGHT_GENRES = [
  "顧客理解・課題整理",
  "業務プロセス改善",
  "AI・ツール活用",
  "導入設計・ロードマップ",
  "研修・リスキリング",
  "定着支援・伴走",
  "組織・コミュニケーション",
  "効果測定・KPI",
  "その他",
] as const;

export type InsightGenre = (typeof INSIGHT_GENRES)[number];
