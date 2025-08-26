export interface ContentPart {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

export type CoreMessage =
  | { role: 'system'; content: string | ContentPart[] }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string | ContentPart[] };

async function postLLM(messages: CoreMessage[]): Promise<string> {
  const res = await fetch('https://toolkit.rork.com/text/llm/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = (await res.json()) as { completion: string };
  return json.completion ?? '';
}

export async function askMemoria(messages: CoreMessage[]): Promise<string> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < 3) {
    try {
      return await postLLM(messages);
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
      attempt++;
    }
  }
  console.log('askMemoria error', lastError);
  return "Impossible de générer une suggestion pour le moment.";
}

export function buildAISystemPrompt(params: {
  userName?: string;
  locale?: string;
  tone?: 'friendly' | 'concise' | 'creative';
  task: 'album_suggestions' | 'captioning' | 'search_query' | 'recommendations';
}): string {
  const { userName, locale = 'fr-FR', tone = 'concise', task } = params;
  const taskHints: Record<typeof params.task, string> = {
    album_suggestions:
      "Tu es un assistant photo. Retourne une liste JSON d'objets {id?: string, title: string, description?: string, reason?: string} sans texte additionnel.",
    captioning:
      "Tu écris des légendes courtes et percutantes pour des photos. Retourne uniquement la légende.",
    search_query:
      "Propose 3 requêtes pertinentes au format JSON: {queries: string[]}.",
    recommendations:
      "Propose des recommandations claires, numérotées, brèves.",
  } as const;
  return [
    `Langue: ${locale}`,
    `Utilisateur: ${userName ?? 'Invité'}`,
    `Ton: ${tone}`,
    `Tâche: ${task}`,
    taskHints[task],
  ].join('\n');
}

export function buildAIMessages(input: {
  system: string;
  query: string;
  context?: Record<string, unknown>;
  images?: string[];
}): CoreMessage[] {
  const parts: ContentPart[] = [{ type: 'text', text: input.query }];
  const imgs = (input.images ?? []).slice(0, 4).map((b64) => ({ type: 'image', image: b64 } as ContentPart));
  const ctx = input.context ? `\nContexte: ${JSON.stringify(input.context).slice(0, 4000)}` : '';
  return [
    { role: 'system', content: input.system },
    { role: 'user', content: [{ type: 'text', text: `${input.query}${ctx}` }, ...imgs] },
  ];
}