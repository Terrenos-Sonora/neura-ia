export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const messages = body.messages || [];

    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Falta OPENAI_API_KEY en Cloudflare" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
      "Ahorita tuve un detalle técnico 😅 ¿Buscas 20x40 o 40x40 y sería para vivir o invertir?";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Error en server", details: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}