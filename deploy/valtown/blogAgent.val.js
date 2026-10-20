// Val Town — free tier. Paste into a new HTTP val, then add an Interval val that calls it.
// 1. vals > New > HTTP val: paste below, set env vars in the val's Environment tab.
// 2. vals > New > Interval: `await blogAgent()` daily.
// Simplified single-file version (no imports from this repo):

export default async function blogAgent(req) {
  const key = blogAgent.env.get("GEMINI_API_KEY");
  const topic = new URL(req.url).searchParams.get("topic") || "AI tools for small businesses";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Write a 700-word blog article in Markdown about: ${topic}. First line = title as # heading. Be factual and specific.` }] }],
      }),
    }
  );
  const j = await r.json();
  const md = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  const title = (md.match(/^#\s+(.*)/m) || [, title])[1] || topic;

  // publish to Buttondown as draft
  const bd = await fetch("https://api.buttondown.com/v1/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Token ${blogAgent.env.get("BUTTONDOWN_API_KEY")}` },
    body: JSON.stringify({ subject: title, body: md, status: "draft" }),
  });
  return Response.json(await bd.json());
}
