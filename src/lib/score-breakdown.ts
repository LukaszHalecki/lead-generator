export interface ScoreBreakdownLine {
  label: string
  points: number
}

export interface QuickAuditScoreBreakdown {
  email: ScoreBreakdownLine[]
  website?: ScoreBreakdownLine[]
  marketing?: ScoreBreakdownLine[]
  ux?: ScoreBreakdownLine[]
  websiteBlend?: string
}
