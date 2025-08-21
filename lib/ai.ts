export interface ContentPart {
  type: "text" | "image";
  text?: string;
  image?: string;
}

export type CoreMessage =
  | { role: "system"; content: string | ContentPart[] }
  | { role: "user"; content: string | ContentPart[] }
  | { role: "assistant"; content: string | ContentPart[] };

export async function askMemoria(messages: CoreMessage[]): Promise<string> {
  try {
    const res = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { completion: string };
    return json.completion;
  } catch (e) {
    console.log("askMemoria error", e);
    return "Impossible de générer une suggestion pour le moment.";
  }
}