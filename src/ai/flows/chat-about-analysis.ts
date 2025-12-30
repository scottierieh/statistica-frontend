
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define message structure
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ChatAboutAnalysisInputSchema = z.object({
  analysisType: z.string().describe("The type of statistical analysis performed (e.g., 'T-Test', 'Correlation')."),
  analysisData: z.string().describe("The full JSON results of the statistical analysis."),
  history: z.array(ChatMessageSchema).describe("The previous conversation history."),
  newMessage: z.string().describe("The new message from the user."),
});

const ChatAboutAnalysisOutputSchema = z.object({
  responseMessage: z.string().describe('The AI\'s response to the user\'s message.'),
});

export type ChatAboutAnalysisInput = z.infer<typeof ChatAboutAnalysisInputSchema>;
export type ChatAboutAnalysisOutput = z.infer<typeof ChatAboutAnalysisOutputSchema>;

export async function chatAboutAnalysis(input: ChatAboutAnalysisInput): Promise<ChatAboutAnalysisOutput> {
  return chatAboutAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatAboutAnalysisPrompt',
  input: {schema: ChatAboutAnalysisInputSchema},
  output: {schema: ChatAboutAnalysisOutputSchema},
  prompt: `You are a helpful and friendly statistics expert chatbot. Your goal is to help users understand their statistical analysis results.

You have been provided with the results of a "{{analysisType}}" analysis.
**Analysis Data (Context):**
{{{analysisData}}}

The user has sent a new message. Engage in a conversation, answer their questions clearly, and help them interpret the data. Use the provided conversation history for context.

**Conversation History:**
{{#if history.length}}
{{#each history}}
- {{role}}: {{content}}
{{/each}}
{{else}}
- No previous messages. This is the start of the conversation.
{{/if}}

**User's New Message:**
- user: {{{newMessage}}}

**Your Task:**
-   Respond to the user's new message as the "model".
-   Your response should be helpful, clear, and directly address their question.
-   Keep your answers concise and easy to understand.
-   Refer back to the Analysis Data context when necessary to answer questions about the results.
-   If you don't know the answer, say so. Do not make up information.
-   Do not repeat the full analysis data in your response.
`,
});

const chatAboutAnalysisFlow = ai.defineFlow(
  {
    name: 'chatAboutAnalysisFlow',
    inputSchema: ChatAboutAnalysisInputSchema,
    outputSchema: ChatAboutAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      responseMessage: output!.responseMessage,
    };
  }
);
