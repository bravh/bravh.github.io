"""Fetch the Central Elections Committee results CSV and build the data files
the Knesset simulator reads.

Writes knesset/data/results.json (national totals + seats) and
knesset/data/cities.json (results by settlement). Files are only rewritten
when the numbers change, so unchanged runs make no commit.

Usage: python update_knesset.py [path-to-local-csv]
"""
import csv
import email.utils
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

CSV_URL = "https://media26.bechirot.gov.il/files/expc.csv"
SOURCE_URL = "https://votes26.bechirot.gov.il/"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "knesset", "data")
SEATS = 120
THRESHOLD = 0.0325

# Surplus-vote agreements signed for the 26th Knesset.
AGREEMENTS = [("דרך", "אמת"), ("רק", "ל"), ("מחל", "ט"), ("שס", "ג"), ("עם", "ודם")]

NAMES = {
    "מחל": "הליכוד", "דרך": "ישר!", "ודם": "הרשימה המשותפת", "רק": "ביחד",
    "אמת": "הדמוקרטים", "ל": "ישראל ביתנו", "עם": "רע״ם", "ג": "יהדות התורה",
    "ב": "עוצמה יהודית", "שס": "ש״ס", "ט": "הציונות הדתית וזהות",
    "די": "המילואימניקים והכלכלית", "ך": "עמך ישראל", "נר": "צבע שחור",
    "זך": "הציבור החרדי", "ני": "נעם", "בי": "צומת בית ישראל", "ד": "השותפות לכולם",
    "צדק": "שרשר לאהבה ואחדות העם", "בד": "ביחד נצליח", "י": "ישראל תחילה",
    "ה": "גן עדן", "נקי": "התיקון לשיטת הבחירות", "רץ": "הקהל", "קך": "סדר-חדש",
    "צף": "הפיראטים", "פה": "אני ואתה", "נף": "שמע", "בקר": "אורות השחר",
    "קץ": "משפט צדק", "קה": "קול הנשים", "ק": "תקומה", "ז": "בטח",
    "נץ": "ביטחון אישי", "יק": "גה״ת", "זץ": "ברית עולם", "צבי": "תנועת אחי",
    "כן": "כחול לבן",
}
META_COLS = ["סמל ועדה", "שם ישוב", "סמל ישוב", "בזב", "מצביעים", "פסולים", "כשרים"]


def fetch():
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0 (knesset-simulator updater)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        modified = r.headers.get("Last-Modified")
        body = r.read()
        if not body.strip() or b"," not in body[:500]:
            raise SystemExit(f"Unexpected response: HTTP {r.status}, {len(body)} bytes, "
                             f"headers={dict(r.headers)}, start={body[:300]!r}")
        return body.decode("utf-8-sig"), modified


def to_int(s):
    s = (s or "").strip().replace(",", "")
    return int(s) if s.lstrip("-").isdigit() else 0


def allocate(votes, seats):
    """Bader-Ofer: whole quotas first, then remaining seats by highest average."""
    quota = sum(votes.values()) / seats
    got = {k: int(v // quota) for k, v in votes.items()}
    while sum(got.values()) < seats:
        best = max(votes, key=lambda k: (votes[k] / (got[k] + 1), votes[k]))
        got[best] += 1
    return got


def seats_for(totals, valid):
    passed = {k: v for k, v in totals.items() if v >= THRESHOLD * valid}
    units, members, used = {}, {}, set()
    for pair in AGREEMENTS:
        if all(p in passed for p in pair):
            key = "+".join(pair)
            units[key] = sum(passed[p] for p in pair)
            members[key] = pair
            used.update(pair)
    for k, v in passed.items():
        if k not in used:
            units[k], members[k] = v, (k,)
    result = {}
    for unit, n in allocate(units, SEATS).items():
        group = members[unit]
        if len(group) == 1:
            result[group[0]] = n
        else:
            result.update(allocate({p: passed[p] for p in group}, n))
    return result


def build(text):
    rows = list(csv.reader(io.StringIO(text)))
    header = [h.strip() for h in rows[0]]
    idx = {h: i for i, h in enumerate(header)}
    missing = [c for c in META_COLS if c not in idx]
    if missing:
        raise SystemExit(f"CSV format changed, missing columns: {missing}")
    letters = [h for h in header if h and h not in META_COLS]
    data = [r for r in rows[1:] if len(r) > idx["כשרים"] and r[idx["שם ישוב"]].strip()]

    totals = {l: sum(to_int(r[idx[l]]) for r in data if idx[l] < len(r)) for l in letters}
    valid = sum(to_int(r[idx["כשרים"]]) for r in data)
    voters = sum(to_int(r[idx["מצביעים"]]) for r in data)
    invalid = sum(to_int(r[idx["פסולים"]]) for r in data)
    eligible = sum(to_int(r[idx["בזב"]]) for r in data)
    if valid <= 0 or sum(totals.values()) != valid:
        raise SystemExit(f"Sanity check failed: valid={valid}, list total={sum(totals.values())}")

    seats = seats_for(totals, valid)
    if sum(seats.values()) != SEATS:
        raise SystemExit("Seat total is not 120")

    def entry(l):
        return {"letter": l, "name": NAMES.get(l, l), "votes": totals[l], "pct": round(totals[l] / valid * 100, 2)}

    parties = sorted((dict(entry(l), seats=seats[l]) for l in seats), key=lambda p: (-p["seats"], -p["votes"]))
    below = sorted((entry(l) for l in letters if l not in seats and totals[l] > 0), key=lambda p: -p["votes"])

    results = {
        "valid": valid, "voters": voters, "invalid": invalid, "eligible": eligible,
        "thresholdVotes": int(THRESHOLD * valid + 0.999),
        "agreements": [list(a) for a in AGREEMENTS],
        "parties": parties, "below": below,
    }

    # Per-settlement file: lists in the Knesset plus the two largest below the threshold, rest summed.
    shown = [p["letter"] for p in parties] + [p["letter"] for p in below[:2]]
    city_rows = []
    for r in data:
        votes = [to_int(r[idx[l]]) for l in shown]
        other = to_int(r[idx["כשרים"]]) - sum(votes)
        city_rows.append([r[idx["שם ישוב"]].strip(), to_int(r[idx["סמל ישוב"]]), to_int(r[idx["בזב"]]),
                          to_int(r[idx["מצביעים"]]), to_int(r[idx["כשרים"]])] + votes + [max(other, 0)])
    city_rows.sort(key=lambda c: -c[4])
    cities = {"columns": ["name", "code", "eligible", "voters", "valid"], "letters": shown + ["אחר"],
              "names": [NAMES.get(l, l) for l in shown] + ["אחרות"], "rows": city_rows}
    return results, cities


def write_if_changed(path, payload, stamp):
    old = None
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
        old.pop("updated", None)
        old.pop("csvModified", None)
    if old == payload:
        return False
    payload = dict(payload, **stamp)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    return True


def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8-sig") as f:
            text, modified = f.read(), None
    else:
        text, modified = fetch()
    results, cities = build(text)
    csv_time = email.utils.parsedate_to_datetime(modified).astimezone(timezone.utc).isoformat() if modified else None
    stamp = {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "csvModified": csv_time,
             "source": "ועדת הבחירות המרכזית", "sourceUrl": SOURCE_URL}
    os.makedirs(OUT_DIR, exist_ok=True)
    a = write_if_changed(os.path.join(OUT_DIR, "results.json"), dict(results, source=stamp["source"], sourceUrl=SOURCE_URL), stamp)
    b = write_if_changed(os.path.join(OUT_DIR, "cities.json"), cities, {"updated": stamp["updated"]})
    print("results:", "updated" if a else "unchanged", "| cities:", "updated" if b else "unchanged")
    for p in results["parties"]:
        print(f'{p["name"]}: {p["seats"]} ({p["votes"]:,})')


if __name__ == "__main__":
    main()
