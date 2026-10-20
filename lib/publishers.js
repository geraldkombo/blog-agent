import { createHmac } from "node:crypto";

const b64url = (s) => Buffer.from(s).toString("base64url");

// Ghost Admin API JWT (HS256, hex secret)
function ghostJwt(id, hexSecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", kid: id, typ: "JWT" }));
  const payload = b64url(JSON.stringify({ aud: "/admin/", iat: now, exp: now + 300 }));
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", Buffer.from(hexSecret, "hex")).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function json(url, opts, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, opts);
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}: ${body.slice(0, 300)}`);
      try { return JSON.parse(body); } catch { return body; }
    } catch (e) {
      lastErr = e;
      if (i === retries || /HTTP 4\d\d/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}
const H = (extra = {}) => ({ "content-type": "application/json", ...extra });

export const PUBLISHERS = {
  beehiiv: {
    label: "beehiiv newsletter (draft post)",
    needs: (e) => e("BEEHIIV_API_KEY") && e("BEEHIIV_PUBLICATION_ID"),
    async publish(a, e) {
      const pub = e("BEEHIIV_PUBLICATION_ID");
      const j = await json(`https://api.beehiiv.com/v2/publications/${pub}/posts`, {
        method: "POST",
        headers: H({ authorization: `Bearer ${e("BEEHIIV_API_KEY")}` }),
        body: JSON.stringify({
          title: a.title,
          subtitle: a.subtitle || "",
          slug: a.slug,
          status: e("PUBLISH_MODE") === "publish" ? "published" : "draft",
          audience: "web",
          type: "newsletter",
          "content": { html: a.html || mdToHtml(a.body) },
          "excerpt": a.subtitle || "",
        }),
      });
      return { id: j.data?.id, url: `https://www.beehiiv.com/posts/${j.data?.slug || a.slug}` };
    },
  },

  buttondown: {
    label: "Buttondown newsletter (draft email)",
    needs: (e) => e("BUTTONDOWN_API_KEY"),
    async publish(a, e) {
      const j = await json("https://api.buttondown.com/v1/emails", {
        method: "POST",
        headers: H({ authorization: `Token ${e("BUTTONDOWN_API_KEY")}` }),
        body: JSON.stringify({
          subject: a.title,
          body: a.body,
          status: e("PUBLISH_MODE") === "publish" ? "about_to_send" : "draft",
        }),
      });
      return { id: j.id, url: j.absolute_url || "" };
    },
  },

  devto: {
    label: "DEV Community",
    needs: (e) => e("DEVTO_API_KEY"),
    async publish(a, e) {
      const j = await json("https://dev.to/api/articles", {
        method: "POST",
        headers: H({ "api-key": e("DEVTO_API_KEY") }),
        body: JSON.stringify({
          article: {
            title: a.title,
            body_markdown: a.body,
            published: e("PUBLISH_MODE") === "publish",
            tags: (a.tags || []).slice(0, 4),
            description: a.subtitle || "",
          },
        }),
      });
      return { id: j.id, url: j.url };
    },
  },

  hashnode: {
    label: "Hashnode",
    needs: (e) => e("HASHNODE_API_KEY") && e("HASHNODE_PUBLICATION_ID"),
    async publish(a, e) {
      const j = await json("https://gql.hashnode.com", {
        method: "POST",
        headers: H({ authorization: e("HASHNODE_API_KEY") }),
        body: JSON.stringify({
          query: `mutation ($input: PublishPostInput!) { publishPost(input: $input) { post { id url } } }`,
          variables: {
            input: {
              title: a.title,
              publicationId: e("HASHNODE_PUBLICATION_ID"),
              tags: (a.tags || []).map((t) => ({ slug: t.toLowerCase().replace(/\s+/g, "-") })),
              content: { markdown: a.body },
              slug: a.slug,
              subtitle: a.subtitle || "",
              ...(e("PUBLISH_MODE") !== "publish" ? { settings: { delisted: true } } : {}),
            },
          },
        }),
      });
      if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
      return { id: j.data.publishPost.post.id, url: j.data.publishPost.post.url };
    },
  },

  ghost: {
    label: "Ghost (self-hosted, Admin API)",
    needs: (e) => e("GHOST_ADMIN_KEY") && e("GHOST_URL"),
    async publish(a, e) {
      const [id, secret] = e("GHOST_ADMIN_KEY").split(":");
      const token = ghostJwt(id, secret);
      const j = await json(`${e("GHOST_URL").replace(/\/$/, "")}/ghost/api/admin/posts/?source=html`, {
        method: "POST",
        headers: { ...H(), authorization: `Ghost ${token}`, "content-version": "v5.0" },
        body: JSON.stringify({
          posts: [{
            title: a.title, slug: a.slug, mobiledoc: "", html: a.html || mdToHtml(a.body),
            custom_excerpt: a.subtitle || "", tags: (a.tags || []).map((t) => ({ name: t })),
            status: e("PUBLISH_MODE") === "publish" ? "published" : "draft",
          }],
        }),
      });
      return { id: j.posts[0].id, url: j.posts[0].url };
    },
  },

  wordpress: {
    label: "WordPress (REST + app password)",
    needs: (e) => e("WORDPRESS_URL") && e("WORDPRESS_USERNAME") && e("WORDPRESS_APP_PASSWORD"),
    async publish(a, e) {
      const auth = Buffer.from(`${e("WORDPRESS_USERNAME")}:${e("WORDPRESS_APP_PASSWORD").replace(/ /g, "")}`).toString("base64");
      const j = await json(`${e("WORDPRESS_URL").replace(/\/$/, "")}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: H({ authorization: `Basic ${auth}` }),
        body: JSON.stringify({
          title: a.title, slug: a.slug, excerpt: a.subtitle || "",
          content: a.html || mdToHtml(a.body),
          status: e("PUBLISH_MODE") === "publish" ? "publish" : "draft",
        }),
      });
      return { id: j.id, url: j.link };
    },
  },

  writeas: {
    label: "Write.as",
    needs: () => true, // no creds required for anonymous posts; WRITEAS_POST_ID+WRITEAS_SECRET to update
    async publish(a, e) {
      // Create (anonymous) or update an existing post when WRITEAS_ID is a post id + secret
      let j;
      if (e("WRITEAS_POST_ID")) {
        j = await json(`https://write.as/api/posts/${e("WRITEAS_POST_ID")}`, {
          method: "PUT",
          headers: H({ authorization: `Token ${e("WRITEAS_POST_ID")}:${e("WRITEAS_SECRET")}` }),
          body: JSON.stringify({ title: a.title, body: a.body }),
        });
      } else {
        j = await json("https://write.as/api/posts", {
          method: "POST",
          headers: H(),
          body: JSON.stringify({ title: a.title, body: a.body, font: "serif" }),
        });
      }
      return { id: j.data?.id, url: `https://write.as/${j.data?.id}` };
    },
  },

  telegraph: {
    label: "Telegraph (no account needed)",
    needs: () => true,
    async publish(a) {
      let token = process.env.TELEGRAPH_ACCESS_TOKEN || "";
      if (!token) {
        const acc = await json("https://api.telegra.ph/createAccount", {
          method: "POST",
          headers: H(),
          body: JSON.stringify({ short_name: "blog-agent", author_name: "blog-agent" }),
        });
        if (!acc.ok) throw new Error("createAccount: " + JSON.stringify(acc).slice(0, 200));
        token = acc.result.access_token;
      }
      const nodes = mdToTelegraph(a.body, a.title);
      const j = await json("https://api.telegra.ph/createPage", {
        method: "POST",
        headers: H(),
        body: JSON.stringify({
          access_token: token, author_name: "blog-agent",
          title: a.title, content: JSON.stringify(nodes), return_content: false,
        }),
      });
      if (!j.ok) throw new Error(JSON.stringify(j).slice(0, 200));
      return { id: j.result.path, url: `https://telegra.ph/${j.result.path}` };
    },
  },

  blogger: {
    label: "Blogger (Google OAuth token)",
    needs: (e) => e("BLOGGER_BLOG_ID") && e("GOOGLE_OAUTH_TOKEN"),
    async publish(a, e) {
      const isDraft = e("PUBLISH_MODE") !== "publish";
      const j = await json(`https://www.googleapis.com/blogger/v3/blogs/${e("BLOGGER_BLOG_ID")}/posts${isDraft ? "?isDraft=true" : ""}`, {
        method: "POST",
        headers: H({ authorization: `Bearer ${e("GOOGLE_OAUTH_TOKEN")}` }),
        body: JSON.stringify({
          kind: "blogger#post", blog: { id: e("BLOGGER_BLOG_ID") },
          title: a.title, content: a.html || mdToHtml(a.body),
          labels: (a.tags || []).slice(0, 5),
        }),
      });
      return { id: j.id, url: j.url };
    },
  },

  medium: {
    label: "Medium (integration token; new tokens restricted by Medium)",
    needs: (e) => e("MEDIUM_INTEGRATION_TOKEN") && e("MEDIUM_AUTHOR_ID"),
    async publish(a, e) {
      const j = await json(`https://api.medium.com/v1/users/${e("MEDIUM_AUTHOR_ID")}/posts`, {
        method: "POST",
        headers: H({ authorization: `Bearer ${e("MEDIUM_INTEGRATION_TOKEN")}` }),
        body: JSON.stringify({
          title: a.title, contentFormat: "markdown", content: a.body,
          publishStatus: e("PUBLISH_MODE") === "publish" ? "public" : "draft",
          tags: (a.tags || []).slice(0, 5),
        }),
      });
      return { id: j.data?.id, url: j.data?.url };
    },
  },

  github: {
    label: "GitHub Pages static blog (commits markdown; git push publishes)",
    needs: () => true,
    async publish(a, e, helpers) {
      const path = `static-site/_posts/${new Date().toISOString().slice(0, 10)}-${a.slug}.md`;
      const front = `---\ntitle: "${a.title.replace(/"/g, "'")}"\ndate: ${new Date().toISOString()}\ntags: [${(a.tags || []).map((t) => `"${t}"`).join(", ")}]\n---\n\n${a.subtitle ? `*${a.subtitle}*\n\n` : ""}${a.body}\n`;
      await helpers.writeLocal(path, front);
      if (e("GITHUB_TOKEN") && e("GITHUB_REPO")) {
        const j = await json(`https://api.github.com/repos/${e("GITHUB_REPO")}/contents/${path}`, {
          method: "PUT",
          headers: H({ authorization: `Bearer ${e("GITHUB_TOKEN")}`, accept: "application/vnd.github+json", "user-agent": "blog-agent" }),
          body: JSON.stringify({ message: `post: ${a.title}`, content: Buffer.from(front).toString("base64"), branch: e("GITHUB_BRANCH") || "main" }),
        });
        return { id: j.content?.sha, url: `https://github.com/${e("GITHUB_REPO")}/blob/${e("GITHUB_BRANCH") || "main"}/${path}` };
      }
      return { id: path, url: `local:${path}` };
    },
  },
};

// ---------- tiny markdown helpers ----------
export function mdToHtml(md) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  const lines = md.split(/\r?\n/);
  let html = "", list = null, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const line of lines) {
    const t = line.trim();
    if (!t) { flushPara(); closeList(); continue; }
    const h = t.match(/^(#{1,6})\s+(.*)/);
    if (h) { flushPara(); closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    const b = t.match(/^[-*]\s+(.*)/);
    if (b) { flushPara(); if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; } html += `<li>${inline(b[1])}</li>`; continue; }
    closeList(); para.push(t);
  }
  flushPara(); closeList();
  return html;
}

function mdToTelegraph(md, title) {
  const nodes = [];
  const inlineToNodes = (s) => {
    // simple split on **bold**, *em*, [link](url)
    let out = [], rest = s;
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/;
    while (rest) {
      const m = rest.match(re);
      if (!m) { out.push(rest); break; }
      if (m.index > 0) out.push(rest.slice(0, m.index));
      if (m[2]) out.push({ tag: "b", children: [m[2]] });
      else if (m[3]) out.push({ tag: "i", children: [m[3]] });
      else out.push({ tag: "a", attrs: { href: m[5] }, children: [m[4]] });
      rest = rest.slice(m.index + m[0].length);
    }
    return out.length ? out : [s];
  };
  for (const line of md.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^(#{1,6})\s+(.*)/);
    if (h) { nodes.push({ tag: h[1].length <= 2 ? "h3" : "h4", children: inlineToNodes(h[2]) }); continue; }
    const b = t.match(/^[-*]\s+(.*)/);
    if (b) { nodes.push({ tag: "li", children: inlineToNodes(b[1]) }); continue; }
    nodes.push({ tag: "p", children: inlineToNodes(t) });
  }
  return nodes.length ? nodes : [{ tag: "p", children: [title] }];
}

export async function publish(name, article, env, helpers) {
  const p = PUBLISHERS[name];
  if (!p) throw new Error(`unknown publisher "${name}". Available: ${Object.keys(PUBLISHERS).join(", ")}`);
  if (!p.needs((k) => env(k))) throw new Error(`${name}: missing env vars (see .env.example)`);
  return p.publish(article, (k) => env(k), helpers);
}

export function publisherStatus(env) {
  const out = {};
  for (const [n, p] of Object.entries(PUBLISHERS)) out[n] = { ready: p.needs((k) => env(k)), label: p.label };
  return out;
}
