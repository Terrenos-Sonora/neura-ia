export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = body.messages || [];

    // ✅ Modo prueba: si no hay key, responde con fallback (NO error)
    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          reply:
            "✅ (Modo prueba) Aún no conecto OpenAI 😄\n\nDime qué quieres que recuerde o en qué te ayudo hoy.",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
      }),
    });

    const data = await r.json();
    const reply =
      data?.choices?.[0]?.message?.content ??
      "Ahorita tuve un detalle técnico 😅";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ reply: "Error en server 😅", details: String(e) }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
}