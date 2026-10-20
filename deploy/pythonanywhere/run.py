# PythonAnywhere — free tier allows ONE scheduled task per day (perfect for this).
# It runs bash, so it can drive Node (PA images include node; if not, use the Python fallback below).

## Node path (preferred)
# 1. Upload this blog-agent folder (Files tab or `git clone`).
# 2. Consoles > Bash:
#    cd ~/blog-agent && npm config set prefix ~/.npm-packages
# 3. Add your .env (never commit it).
# 4. Tasks tab > Scheduled daily task > UTC time e.g. 05:30:
#    /usr/bin/bash -lc 'cd ~/blog-agent && node run.js once >> ~/blog-agent.log 2>&1'

## Python fallback (no Node needed) — daily task:
#    /usr/bin/python3 ~/blog-agent/deploy/pythonanywhere/run.py
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

def load_env():
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        for line in open(p):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

def gemini(prompt):
    key = os.environ["GEMINI_API_KEY"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={key}"
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    req = urllib.request.Request(url, data=body, headers={"content-type": "application/json"})
    j = json.load(urllib.request.urlopen(req, timeout=120))
    return "".join(p["text"] for p in j["candidates"][0]["content"]["parts"])

def buttondown(title, md):
    req = urllib.request.Request(
        "https://api.buttondown.com/v1/emails",
        data=json.dumps({"subject": title, "body": md, "status": "draft"}).encode(),
        headers={"content-type": "application/json", "authorization": f"Token {os.environ['BUTTONDOWN_API_KEY']}"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req, timeout=60))

if __name__ == "__main__":
    load_env()
    topic = os.environ.get("BLOG_TOPIC", "a useful AI tool")
    md = gemini(f"Write a 700-word blog article in Markdown about: {topic}. First line = title as # heading.")
    title = next((l[2:].strip() for l in md.splitlines() if l.startswith("# ")), topic)
    print(buttondown(title, md))
