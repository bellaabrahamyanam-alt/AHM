# Rebuild notes/index.json from the .md files.  Usage: python3 build_notes_index.py <path-to-notes-folder>
# Each note: <notes>/<place-uuid>/<note-uuid>.md with a small header (id, lang, title, and an optional date as one line
# of JSON), then the text. Notes still in an older format (year/when lines, or <lang>.md file names) are converted by the
# dev server, by enabling the extension, or by any save: not here.
import json, os, sys

root = sys.argv[1]
out = []
for place in sorted(os.listdir(root)):
    d = os.path.join(root, place)
    if not os.path.isdir(d):
        continue
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md"):
            continue
        raw = open(os.path.join(d, fn), encoding="utf-8").read()
        _, head, body = raw.split("---\n", 2)
        meta = dict(l.split(": ", 1) for l in head.strip().splitlines())
        if "year" in meta and "date" not in meta:
            print("old date format in", fn, "- start the dev server once to convert it", file=sys.stderr)
        out.append(
            {
                "id": meta["id"],
                "place": place,
                "lang": meta["lang"],
                "title": meta["title"],
                "date": json.loads(meta["date"]) if "date" in meta else None,
                "text": body.strip(),
            }
        )
json.dump(
    {"version": 1, "notes": out}, open(os.path.join(root, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1
)
print(len(out), "notes indexed")
