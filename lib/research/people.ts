import { getExaClient } from '@/lib/exa';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { PeopleResearch } from '@/db/schema';

const PeopleResearchResultSchema = z.object({
  isConfidentMatch: z
    .boolean()
    .describe(
      'Whether the search results confidently match the target contact',
    ),
  matchedCompany: z
    .string()
    .nullable()
    .describe('Company name found in results (verification signal)'),
  title: z.string().describe("Person's role/title"),
  contactSummary: z
    .string()
    .describe('Summary of who they are professionally'),
  recentActivity: z
    .array(z.string())
    .describe('Recent public activity, talks, blog posts, etc.'),
});

export async function researchPerson({
  contactName,
  contactEmail,
  accountName,
}: {
  contactName: string;
  contactEmail?: string;
  accountName: string;
}): Promise<PeopleResearch | null> {
  try {
    const exa = getExaClient();

    const [profileResults, activityResults] = await Promise.all([
      exa.searchAndContents(`"${contactName}" "${accountName}"`, {
        numResults: 3,
        type: 'auto',
        category: 'people' as 'company',
        summary: true,
      }),
      exa.searchAndContents(
        `"${contactName}" (speaker OR conference OR blog OR article)`,
        {
          numResults: 2,
          type: 'auto',
          summary: true,
        },
      ),
    ]);

    const allResults = [
      ...(profileResults.results || []),
      ...(activityResults.results || []),
    ];

    const sources = allResults
      .filter((r) => r.url && r.summary)
      .map((r) => ({ url: r.url, summary: r.summary || '' }));

    if (sources.length === 0) {
      return null;
    }

    const emailContext = contactEmail ? ` (email: ${contactEmail})` : '';

    const { output } = await generateText({
      model: 'anthropic/claude-haiku-4-5',
      output: Output.object({ schema: PeopleResearchResultSchema }),
      prompt: `You are verifying whether search results match a specific person: ${contactName} who works at ${accountName}${emailContext}.

Set isConfidentMatch=true ONLY if you find clear evidence this is the same person (company and name must match). If results seem to be about a different person with a similar name, set isConfidentMatch=false.

Extract the following from the search results:
- Their current title/role
- A professional summary of who they are
- Any recent public activity (talks, blog posts, articles, etc.)

Search results:
${sources.map((s) => `URL: ${s.url}\nSummary: ${s.summary}`).join('\n\n')}`,
    });

    if (!output?.isConfidentMatch || !output.matchedCompany) {
      return null;
    }

    return {
      title: output.title,
      contactSummary: output.contactSummary,
      recentActivity: output.recentActivity,
    };
  } catch (error) {
    console.error(`[people-research] Failed for ${contactName}:`, error);
    return null;
  }
}
