"""Build 'DC Figures': DM Sans digits 0-9 re-spaced to one common advance width
(tabular), so prices and quantities line up. Source: DM Sans (OFL 1.1), renamed."""
import sys, subprocess, pathlib
from fontTools.ttLib import TTFont
src_dir, out_dir = map(pathlib.Path, sys.argv[1:3])
for w in (400, 500, 600, 700):
    src = src_dir / f"dm-sans-latin-{w}-normal.woff"
    tmp = out_dir / f"tmp-{w}.ttf"
    subprocess.run(["pyftsubset", str(src), "--unicodes=U+0030-0039", "--layout-features=", "--no-hinting",
                    "--desubroutinize", f"--output-file={tmp}"], check=True)
    f = TTFont(tmp)
    cmap = f.getBestCmap(); glyf = f["glyf"]; hmtx = f["hmtx"]
    names = [cmap[ord(c)] for c in "0123456789"]
    ink = {}
    for n in names:
        g = glyf[n]; g.recalcBounds(glyf); ink[n] = (g.xMin, g.xMax)
    max_ink = max(x1 - x0 for x0, x1 in ink.values())
    side = 40  # minimum side bearing in font units (1000 upm)
    W = max_ink + 2 * side
    for n in names:
        g = glyf[n]; x0, x1 = ink[n]
        dx = round((W - (x1 - x0)) / 2 - x0)
        if g.isComposite():
            for c in g.components: c.x += dx
        else:
            g.coordinates.translate((dx, 0))
        g.recalcBounds(glyf)
        hmtx[n] = (W, g.xMin)
    for rec in f["name"].names:
        if rec.nameID in (1, 16): rec.string = "DC Figures"
        elif rec.nameID in (4,): rec.string = f"DC Figures {w}"
        elif rec.nameID in (6,): rec.string = f"DCFigures-{w}"
        elif rec.nameID == 3: rec.string = f"DCFigures-{w};tabular"
    f.flavor = "woff"
    out = out_dir / f"dc-figures-{w}.woff"
    f.save(out); tmp.unlink()
    print(w, "advance", W, "max ink", max_ink, out.stat().st_size, "bytes")
