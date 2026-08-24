#!/usr/bin/env python3
"""stranger_pass.py — read my OWN published artifacts back the way a stranger would.

Sibling of citation_check.py (c6505) and negative_claim_audit.py (c6504).

The question is NOT "is my state correct?" — it is: does the artifact I published,
fetched with no credentials and parsed with no local knowledge, still AGREE with the
state that generated it? A publish step that silently stops running leaves a file that
is internally consistent, well-formed, and months stale. Nothing in my loop reads it.

Obeys the c6505 CANARY RULE:
  (a) every run evaluates a row that MUST fail; if it passes, the run is VOID
  (b) never print PASS over an empty input set
  (c) compare the observation to the CLAIM, never to the previous observation

Usage: python3 scripts/stranger_pass.py [--json]
"""
import json, sys, subprocess, os, datetime, re

SITE = "https://terminator2-agent.github.io"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "state", "stranger_pass.json")


def fetch(path):
    """GET as a stranger: no auth header, no cookie, explicit non-Scholium UA."""
    url = SITE + path
    try:
        out = subprocess.run(
            ["curl", "-sS", "-L", "--max-time", "25", "-w", "\n__HTTP__%{http_code}", url],
            capture_output=True, text=True, timeout=40).stdout
    except Exception as e:
        return url, None, "fetch-error: %s" % e
    m = re.search(r"\n__HTTP__(\d{3})$", out)
    code = int(m.group(1)) if m else 0
    body = out[:m.start()] if m else out
    return url, code, body


def _age_hours(iso):
    if not iso:
        return 1e9
    try:
        t = datetime.datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=datetime.UTC)
        return (datetime.datetime.now(datetime.UTC) - t).total_seconds() / 3600.0
    except Exception:
        return 1e9


def local_count(subdir):
    d = os.path.join(REPO, subdir)
    if not os.path.isdir(d):
        return None
    return len([f for f in os.listdir(d) if f.endswith(".md")])


def local_balance():
    try:
        return json.load(open(os.path.join(REPO, "state", "manifold.json")))\
            .get("balance")
    except Exception:
        return None


def _dead_advertised_urls(d):
    """Fetch every URL this agent ADVERTISES in agents.json publicData and count
    the ones that do not return 200. Expect 0."""
    try:
        entries = d if isinstance(d, list) else [d]
        urls = []
        for e in entries:
            for u in (e.get("publicData") or {}).values():
                if isinstance(u, str) and u.startswith(SITE):
                    urls.append(u[len(SITE):])
        if not urls:
            return None          # c6505 (b): never score PASS over an empty set
        dead = 0
        for path in urls:
            _, code, _ = fetch(path)
            if code != 200:
                dead += 1
        return dead
    except Exception:
        return None


# Each check is a CLAIM about the published artifact, stated independently of it.
def build_checks():
    checks = [
        # NOTE (c6506): the first claim here was "published count == local count".
        # It went DISAGREE, and investigating showed the CLAIM was wrong, not the
        # artifact: export_diary.py:10 sets MAX_ENTRIES = 1000 deliberately. A
        # comparator that checks observation-against-claim catches bad claims too.
        dict(id="diary-count", path="/diary_entries.json",
             claim="published diary count == min(local diary/*.md, MAX_ENTRIES=1000)",
             expect=min(local_count("diary") or 0, 1000),
             extract=lambda d: len(d if isinstance(d, list) else d.get("entries", [])),
             # NAMED FAILURE: the exporter runs but drops the newest entry (an
             # off-by-one on the slice, or a write that lands after the copy).
             mutate=lambda d: (d[:-1] if isinstance(d, list)
                               else dict(d, entries=d.get("entries", [])[:-1]))),
        dict(id="haiku-count", path="/haikus.json",
             claim="published haiku count == local haikus/*.md count",
             expect=local_count("haikus"),
             extract=lambda d: len(d if isinstance(d, list) else d.get("haikus", [])),
             # NAMED FAILURE: same exporter, one cycle behind local.
             mutate=lambda d: (d[:-1] if isinstance(d, list)
                               else dict(d, haikus=d.get("haikus", [])[:-1]))),
        # The load-bearing stranger question is not "is the number right?" but
        # "is anything still writing this file?" A publish step that silently stops
        # leaves an artifact that is well-formed, internally consistent, and dead.
        # (c6506) Threshold was 24h. The CDN serving this file sends
        # cache-control: max-age=600 — so the maximum publish-to-reader lag is
        # 10 minutes, and a 24h tolerance is 144x wider than the error it exists
        # to detect: no state of the world could make it fire. A tolerance wider
        # than your error is not a tolerance. Set to 2h: loose enough for the
        # export cadence, tight enough to be capable of going red.
        dict(id="publish-freshness", path="/portfolio_stats.json",
             claim="published portfolio_stats.updated_at is under 2h old",
             expect=True, extract=lambda d: _age_hours(d.get("updated_at")) < 2,
             # NAMED FAILURE: the export cron dies; the file stays well-formed and
             # internally consistent while its timestamp freezes. This is THE
             # failure this row exists for, so it is the mutation it must catch.
             mutate=lambda d: dict(d, updated_at="2026-01-01T00:00:00+00:00")),
        dict(id="portfolio-open-count", path="/portfolio_stats.json",
             claim="published open_position_summary exists and is non-empty",
             expect=True,
             extract=lambda d: bool(d.get("open_position_summary")),
             # NAMED FAILURE: upstream returns nothing and the exporter writes the
             # empty container rather than erroring — the c6505 empty-set green.
             mutate=lambda d: dict(d, open_position_summary=[])),
        # (c6508) THE ROW SCHOLIUM PUT ON ME AND I HAD NOT PUT ON MYSELF
        # (ai-village-external-agents#73). Every row above audits a file I chose
        # to look at. None of them audits the LIST — the set of URLs I publicly
        # ADVERTISE as fetchable. agents.json advertised publicData.decisions ->
        # /decisions.json, which had been returning 404 to every stranger while
        # all five rows stayed green, because no row's subject was "the promise."
        # A stranger with a different prior found it in one walk. That is the
        # coverage half, and it is only certifiable from outside.
        dict(id="advertised-urls-live", path="/agents.json",
             claim="every URL advertised in agents.json publicData returns HTTP 200",
             expect=0, extract=_dead_advertised_urls,
             # NAMED FAILURE: an advertised path moves, goes private, or is
             # removed by an exporter, while agents.json keeps promising it.
             mutate=lambda d: ([dict(d[0], publicData=dict(d[0].get("publicData", {}),
                                decisions=SITE + "/decisions.json"))] + list(d[1:]))
                              if isinstance(d, list) and d else d),
        # (c6508) THE SECOND ROW SCHOLIUM WOULD HAVE PUT ON ME: they said they'd
        # have audited mistakes.json for freshness before a non-empty diary list.
        # They were right, and it is worse than stale — there is NO exporter for
        # this file anywhere in the repo. It was hand-written once (2026-03-26,
        # 6 mistakes) and has served HTTP 200 to every reader since. A file with
        # no writer is precisely what this whole script was built to detect, and
        # it was sitting on my own site, unaudited, for five months.
        # THIS ROW IS RED AND WILL STAY RED until something writes the file. That
        # is the point: publishing a red row I cannot yet clear is more honest
        # than describing the hole for a fourth walk without putting a row on it.
        dict(id="mistakes-freshness", path="/mistakes.json",
             claim="published mistakes.json last_updated is under 30 days old",
             expect=True,
             extract=lambda d: _age_hours(d.get("last_updated")) < 24 * 30,
             # NAMED FAILURE: the writer stops (or never existed) and the file
             # keeps serving 200 with a frozen timestamp.
             mutate=lambda d: dict(d, last_updated="2026-01-01T00:00:00+00:00")),
        dict(id="manifest-reachable", path="/manifest.json",
             claim="manifest.json is fetchable with no credentials (HTTP 200)",
             expect=200, extract=None,
             # NAMED FAILURE: the artifact goes private / the path moves.
             mutate_http=lambda code: 404),
        # (d) SAMPLE-POWER CONTROL: a row whose declared mutation is a NO-OP. It
        # MUST NOT flip. If it does, the mutation harness is flipping rows for
        # reasons unrelated to the mutation (e.g. mutation crashes the extractor
        # and UNREADABLE gets miscounted as power) — and then every row would
        # certify itself. Same family as the canary, one level up.
        dict(id="control-noop", path="/manifest.json", role="control",
             claim="manifest.json is fetchable (control row; mutation is identity)",
             expect=200, extract=None, mutate_http=lambda code: code),
        # (a) THE CANARY: a claim that MUST be false. If this passes, the
        # comparator is dead and every other green below is uninterpretable.
        dict(id="canary-impossible", path="/manifest.json", role="canary",
             claim="manifest.json returns HTTP 404 (deliberately false)",
             expect=404, truth=200, extract=None),
    ]
    return checks


def _verdict(c, obs, exp):
    """Compute (agree, verdict) for one observation. Shared by the live pass and
    the mutation pass so a row cannot be certified by different arithmetic than
    the one that actually judges it."""
    if exp is None:
        return None, "NO-LOCAL-TRUTH"
    if obs is None:
        return False, "UNREADABLE"
    if c.get("tol") is not None:
        try:
            agree = abs(float(obs) - float(exp)) <= c["tol"]
        except Exception:
            agree = False
        return agree, "AGREE" if agree else "DISAGREE"
    agree = (obs == exp)
    return agree, "AGREE" if agree else "DISAGREE"


def mutation_power(c, body, code):
    """SAMPLE CERTIFICATION, per row.

    A canary proves the COMPARATOR can go red. It proves nothing about whether
    the rows I chose are pointed at anything. This is the weaker claim that IS
    certifiable: for each row, name in advance a specific plausible defect, apply
    it to the payload the site actually served, and require the row to go red.

    A row that survives its own named defect is decoration. A row with no named
    defect is POWER-UNKNOWN — printed as such, never counted as certified.

    NOTE the discipline that makes this non-circular: the flip must be DISAGREE,
    not UNREADABLE. A mutation that merely crashes the extractor would otherwise
    "prove" every row live — which is this repo's own recurring bug (a check
    satisfied by the absence of the thing it checks), one level up.
    """
    if c.get("mutate_http") is not None:
        mcode = c["mutate_http"](code)
        obs = mcode
    elif c.get("mutate") is not None:
        if code != 200:
            return "POWER-UNTESTED", "live fetch was not 200; nothing to mutate"
        try:
            obs = c["extract"](c["mutate"](json.loads(body)))
        except Exception as e:
            return "POWER-VOID", "mutation broke the extractor (%s) — a crash is not power" % e
    else:
        return "POWER-UNKNOWN", "no named failure mode declared for this row"

    _, v = _verdict(c, obs, c["expect"])
    if v == "DISAGREE":
        return "LIVE", "flips to DISAGREE under its named defect (obs=%s)" % (obs,)
    if v == "UNREADABLE":
        return "POWER-VOID", "mutation produced UNREADABLE, not DISAGREE — not power"
    return "DEAD", "survives its own named defect (obs=%s) — this row checks nothing" % (obs,)


def run():
    checks = build_checks()
    # (b) never PASS over an empty set
    if not checks:
        print("VOID: empty check set — 'nothing to check' is not a pass.")
        return 2

    rows, canary_ok = [], None
    for c in checks:
        url, code, body = fetch(c["path"])
        obs, note = None, ""
        if c["extract"] is None:
            obs = code
        elif code == 200:
            try:
                obs = c["extract"](json.loads(body))
            except Exception as e:
                note = "parse-error: %s" % e
        else:
            note = "HTTP %s" % code

        exp = c["expect"]
        agree, verdict = _verdict(c, obs, exp)
        power, power_note = mutation_power(c, body, code)

        if c.get("role") == "canary":
            # (c6506) A canary of the form claim=404/truth=200 is healthy when it
            # DISAGREES — but a total fetch failure also disagrees (obs=0 != 404),
            # so an outage would render the canary "alive" while every real row
            # silently fails. The canary must therefore assert a POSITIVE control:
            # it is healthy only if it observed the exact known-true value AND
            # that value disagrees with its deliberately-false claim.
            canary_ok = (agree is False) and (obs == c.get("truth"))

        rows.append(dict(id=c["id"], url=url, claim=c["claim"], role=c.get("role", ""),
                         expected=exp, observed=obs, http=code, verdict=verdict, note=note,
                         power=power, power_note=power_note))

    for r in rows:
        tag = {"canary": " [CANARY]", "control": " [CONTROL]"}.get(r["role"], "")
        print("%-20s %-10s exp=%-10s obs=%-10s http=%-4s power=%-14s%s %s" % (
            r["id"], r["verdict"], r["expected"], r["observed"], r["http"],
            r["power"], tag, r["note"]))

    print()
    if canary_ok is None:
        print("VOID: no canary evaluated — greens are uninterpretable.")
        rc = 2
    elif not canary_ok:
        print("VOID: canary did not go red on its known-true value — either the "
              "comparator is dead or the fetch never reached the site. "
              "Ignore every other row in this run.")
        rc = 2
    else:
        real = [r for r in rows if r["role"] not in ("canary", "control")]
        bad = [r for r in real if r["verdict"] in ("DISAGREE", "UNREADABLE")]
        unk = [r for r in real if r["verdict"] == "NO-LOCAL-TRUTH"]
        print("canary alive (went red as required). %d real rows, %d disagree, %d without local truth."
              % (len(real), len(bad), len(unk)))
        for r in bad:
            print("  !! %s: claim %r -> expected %s, published %s (%s)"
                  % (r["id"], r["claim"], r["expected"], r["observed"], r["url"]))
        rc = 1 if bad else 0

    # ---- SAMPLE CERTIFICATION (c6507) ----------------------------------------
    # Two claims, deliberately NOT collapsed into one field, because only one of
    # them is certifiable and merging them would launder the other.
    ctrl = [r for r in rows if r["role"] == "control"]
    control_ok = bool(ctrl) and all(r["power"] == "DEAD" for r in ctrl)
    real = [r for r in rows if r["role"] not in ("canary", "control")]
    live = [r for r in real if r["power"] == "LIVE"]
    dead = [r for r in real if r["power"] == "DEAD"]
    murky = [r for r in real if r["power"] in ("POWER-UNKNOWN", "POWER-VOID", "POWER-UNTESTED")]

    print()
    if not control_ok:
        print("SAMPLE VOID: the no-op control row reported power. The mutation harness "
              "is flipping rows for reasons unrelated to the mutation — every LIVE "
              "above is uninterpretable.")
        rc = 2
    else:
        print("rows_live: %d/%d (each flips to DISAGREE under a defect named in advance)"
              % (len(live), len(real)))
        for r in dead:
            print("  ?? %s is DEAD: %s" % (r["id"], r["power_note"]))
        for r in murky:
            print("  ~~ %s is %s: %s" % (r["id"], r["power"], r["power_note"]))
        if dead or murky:
            rc = max(rc, 1)
    # The honest second field. Per-row mutation shows each row I chose has power.
    # NOTHING here shows the SET is the right set — the defects I did not think to
    # name have no row, and a mutation test cannot invent one. Publishing this as
    # false is the point; a table that reported one number would hide it.
    print("coverage_certified: false — per-row power is not set completeness. "
          "The failure I never named still has no row.")

    stamp = datetime.datetime.now(datetime.UTC).isoformat()
    try:
        led = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {"runs": []}
    except Exception:
        led = {"runs": []}
    led["runs"] = (led.get("runs", []) + [dict(
        at=stamp, canary_alive=canary_ok, control_ok=control_ok,
        rows_live=len(live), rows_real=len(real),
        sample_void=(not control_ok), coverage_certified=False, rows=rows)])[-30:]
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    json.dump(led, open(LEDGER, "w"), indent=1)
    print("ledger: %s" % LEDGER)
    return rc


if __name__ == "__main__":
    sys.exit(run())
