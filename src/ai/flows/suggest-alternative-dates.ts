'use server';

/**
 * @fileOverview Suggests alternative dates for a holiday request based on team conflicts.
 *
 * - suggestAlternativeDates - A function that suggests alternative dates.
 * - SuggestAlternativeDatesInput - The input type for the suggestAlternativeDates function.
 * - SuggestAlternativeDatesOutput - The return type for the suggestAlternativeDates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeDatesInputSchema = z.object({
  startDate: z.string().describe('The start date of the requested time off (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the requested time off (YYYY-MM-DD).'),
  teamMembers: z
    .array(z.object({name: z.string(), absences: z.array(z.object({start: z.string(), end: z.string()}))}))
    .describe('List of team members and their existing absences.'),
  requesterName: z.string().describe('The name of the team member requesting time off.'),
});
export type SuggestAlternativeDatesInput = z.infer<typeof SuggestAlternativeDatesInputSchema>;

const SuggestAlternativeDatesOutputSchema = z.object({
  alternativeDates: z
    .array(z.object({start: z.string(), end: z.string()}))
    .describe('Suggested alternative date ranges that minimize conflicts.'),
  reasoning: z.string().describe('Explanation of why these dates were suggested.'),
});
export type SuggestAlternativeDatesOutput = z.infer<typeof SuggestAlternativeDatesOutputSchema>;

export async function suggestAlternativeDates(input: SuggestAlternativeDatesInput): Promise<SuggestAlternativeDatesOutput> {
  return suggestAlternativeDatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlternativeDatesPrompt',
  input: {schema: SuggestAlternativeDatesInputSchema},
  output: {schema: SuggestAlternativeDatesOutputSchema},
  prompt: `You are an assistant helping to find alternative dates for time off requests, minimizing conflicts with other team members.

The team member requesting time off is: {{{requesterName}}}.

The requested time off is from {{{startDate}}} to {{{endDate}}}.

Here is a list of team members and their existing absences:
{{#each teamMembers}}
  - Name: {{name}}
  {{#each absences}}
    - From: {{start}} to {{end}}
  {{/each}}
{{/each}}

Suggest at least three alternative date ranges that minimize conflicts with existing absences. Explain your reasoning for suggesting these dates.

Please respond with a JSON object in this exact format:
{
  "alternativeDates": [
    {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
    {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
    {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  ],
  "reasoning": "Explanation of why these dates were suggested to minimize conflicts"
}
`,
});

const suggestAlternativeDatesFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeDatesFlow',
    inputSchema: SuggestAlternativeDatesInputSchema,
    outputSchema: SuggestAlternativeDatesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
