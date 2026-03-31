import { getExaClient } from '@/lib/exa';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { CompanyResearch } from '@/db/schema';

const CompanyResearchResultSchema = z.object({
  existingAIFeatures: z
    .array(z.string())
    .describe('List of AI features/products the company already offers'),
  companySummary: z
    .string()
    .describe('Brief summary of what the company does'),
});

export async function researchCompany(
  companyName: string,
): Promise<CompanyResearch> {
  try {
    const exa = getExaClient();

    const [searchResults, docsResults] = await Promise.all([
      exa.searchAndContents(`${companyName} AI features products`, {
        numResults: 3,
        type: 'auto',
        category: 'company',
        summary: true,
      }),
      exa.searchAndContents(`${companyName} engineering blog AI`, {
        numResults: 2,
        type: 'auto',
        category: 'news',
        summary: true,
      }),
    ]);

    const allResults = [
      ...(searchResults.results || []),
      ...(docsResults.results || []),
    ];

    const sources = allResults
      .filter((r) => r.url && r.summary)
      .map((r) => ({ url: r.url, summary: r.summary || '' }));

    if (sources.length === 0) {
      return {
        existingAIFeatures: [],
        companySummary: `${companyName} is a company.`,
      };
    }

    const { output } = await generateText({
      model: 'anthropic/claude-haiku-4-5',
      output: Output.object({ schema: CompanyResearchResultSchema }),
      prompt: `Based on the following research results about ${companyName}, extract:
1. Any AI features or products they already offer
2. A brief summary of what the company does

Research results:
${sources.map((s) => `URL: ${s.url}\nSummary: ${s.summary}`).join('\n\n')}

If no AI features are found, return an empty array for existingAIFeatures.`,
    });

    return output!;
  } catch (error) {
    console.error(`[research] Failed to research ${companyName}:`, error);
    return {
      existingAIFeatures: [],
      companySummary: `${companyName} is a company.`,
    };
  }
}
