export const WORKSPACE_TOPIC_VALUES = [
  "technology_ai",
  "financial_markets_crypto",
  "corporate_business",
  "healthcare_life_sciences",
  "trade_supply_chains",
  "labour_immigration",
  "tax_benefits",
  "environment_materials",
] as const;

export type WorkspaceTopic = (typeof WORKSPACE_TOPIC_VALUES)[number];

export const WORKSPACE_TOPIC_LABELS: Record<WorkspaceTopic, string> = {
  technology_ai: "Technology & AI",
  financial_markets_crypto: "Financial markets & crypto",
  corporate_business: "Corporate & business",
  healthcare_life_sciences: "Healthcare & life sciences",
  trade_supply_chains: "Trade & supply chains",
  labour_immigration: "Labour & immigration",
  tax_benefits: "Tax & benefits",
  environment_materials: "Environment & materials",
};

const topicPatterns: Array<[WorkspaceTopic, RegExp]> = [
  [
    "technology_ai",
    /\b(ai|artificial intelligence|machine learning|algorithm|digital|software|cyber|data|privacy|online platform)\b/i,
  ],
  [
    "financial_markets_crypto",
    /\b(sec|securities|crypto|cryptocurrency|digital asset|financial market|investment|asset management|mifir|transaction reporting|fund|broker|capital market)\b/i,
  ],
  [
    "corporate_business",
    /\b(corporate|company|companies|business|employer|governance|disclosure|competition|merger|acquisition|insolvency|board)\b/i,
  ],
  [
    "healthcare_life_sciences",
    /\b(health|healthcare|medical|medicine|pharma|pharmaceutical|biotech|clinical|hospital|patient|life sciences)\b/i,
  ],
  [
    "trade_supply_chains",
    /\b(export|import|entity list|trade|supply chain|supplier|critical mineral|black mass|tungsten|customs|allocation)\b/i,
  ],
  [
    "labour_immigration",
    /\b(h-?1b|immigration|visa|labou?r|employment|workforce|worker|talent|mobility|petition)\b/i,
  ],
  [
    "tax_benefits",
    /\b(tax|taxation|irs|benefit|dependent care|contribution|account|fee|fiscal)\b/i,
  ],
  [
    "environment_materials",
    /\b(environment|epa|climate|packaging|pfas|waste|recycl|material|pollution|energy|emission)\b/i,
  ],
];

export function classifyWorkspaceTopics(input: {
  headline: string;
  summary: string;
}): WorkspaceTopic[] {
  const text = `${input.headline} ${input.summary}`;
  const matches = topicPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([topic]) => topic);
  return matches.length ? matches.slice(0, 2) : ["corporate_business"];
}
