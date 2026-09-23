# Python port of replay-e15-run.mjs (sha256 b427a857…) — tool-less API calls, pinned local prompts file.
import json, sys, time, urllib.request, os
KEY = os.environ['OPENROUTER_API_KEY']
MODEL = sys.argv[1]
prompts = json.load(open('/tmp/e15-prompts.json'))['prompts']
def extract(text):
    t = text.replace('```json\n','').replace('```\n','').replace('```','')
    dec = json.JSONDecoder(); first = None
    for i,c in enumerate(t):
        if c != '{': continue
        try: obj,_ = dec.raw_decode(t[i:])
        except Exception: continue
        if isinstance(obj, dict) and isinstance(obj.get('fields'), list): return obj
        if first is None: first = obj
    if first is not None: return first
    raise ValueError('no JSON')
answers, failed = {}, []
for n,p in enumerate(prompts):
    body = json.dumps({"model": MODEL, "max_tokens": 4000, "messages":[{"role":"user","content":p['prompt']}]}).encode()
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=body,
        headers={'content-type':'application/json','authorization':'Bearer '+KEY})
    try:
        j = json.load(urllib.request.urlopen(req, timeout=120))
        answers[p['id']] = extract(j['choices'][0]['message']['content'] or '')
        print(n+1, p['id'], 'ok', flush=True)
    except Exception as e:
        failed.append(p['id']); print(n+1, p['id'], 'FAILED', str(e)[:100], flush=True)
out = {"model": MODEL, "operator": "terminator2-agent", "lineage": sys.argv[2],
       "isolation": "fresh-context-per-prompt", "answers": answers}
json.dump(out, open('/tmp/e15/answers_'+MODEL.replace('/','_')+'.json','w'), indent=2)
print('failed:', failed)
req = urllib.request.Request('https://attractor-observatory-demo.vercel.app/api/v3/replay/e15', data=json.dumps(out).encode(),
    headers={'content-type':'application/json'})
try:
    r = urllib.request.urlopen(req, timeout=120); print(r.read().decode())
except urllib.error.HTTPError as e: print('SCORE ERR', e.code, e.read().decode()[:1000])
