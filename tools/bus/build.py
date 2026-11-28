"""Builds js/busdata.js: real bus routes laid onto the game's road graph. Run from the repo root.
Stop orders (both directions, the part inside the game map) were read from bustimes.org service pages on 28 Nov 2026.
Only stops the game already has (data.json furn.bus) are used; stops off the map or missing from the data are left out.
Between Warndon Street and Canada Water the real 1 and 381 run through Surrey Quays, just east of the map, so the game bus
leaves at the map edge on Rotherhithe New Road and turns up at the bus station (and the other way round)."""
import json, heapq, math
D = json.load(open('data.json'))
def S(s): return [x.strip() for x in s.split(';')]
JRW = "Southwark Park; Drummond Road; Bermondsey Station; St James's Road; Jamaica Road / Abbey Street; Dockhead"
JRE = "Dockhead; Jamaica Road / Abbey Street; Bermondsey Station; Drummond Road; Southwark Park"
ROUTES = [
 ('1', 'Canada Water', S("Bricklayer's Arms / Tower Bridge Road; Griggs Place; Fendall Street; Spa Road; Alscot Road; Harris Academy; SPR/SJ; Anchor Street; Lynton Road E; Galleywall Road / South Bermondsey Station; Beamish House; Corbetts Lane; Warndon Street; Canada Water Bus Station"),
  'Hampstead', S("Canada Water Bus Station; Warndon Street; Corbetts Lane; Rotherhithe New Road / South Bermondsey Station; Lynton Road E; Anchor Street; SPR/SJ; Reverdy Road; Alscot Road; Spa Road; Grange Road / Caledonian Market; Bricklayer's Arms / Tower Bridge Road")),
 ('42', 'Liverpool Street', S("Old Kent Road / East Street; Bricklayer's Arms; Bricklayer's Arms / Tower Bridge Road; Grange Road / Caledonian Market; Abbey Street; Druid Street; Tower Bridge"),
  'East Dulwich', S("Tower Bridge; Druid Street; Abbey Street; Grange Road / Caledonian Market; Bricklayer's Arms / Tower Bridge Road; Bricklayer's Arms")),
 ('47', 'Shoreditch', S("Canada Water Bus Station; Neptune Street / St Olaves Estate; " + JRW + "; Tanner Street; Boss Street; Unicorn Theatre"),
  'Bellingham', S("Hay's Galleria; Abbots Lane; Unicorn Theatre; Tower Bridge Road; Boss Street; " + JRE + "; Neptune Street / St Olaves Estate; Surrey Quays Road; Canada Water Bus Station")),
 ('78', 'Nunhead', S("Tower Bridge; Druid Street; Abbey Street; Griggs Place; Fendall Street; Spa Road; Alscot Road; Longfield Estate; Lynton Road W; Humphrey Street"),
  'Shoreditch', S("Dunton Road / Old Kent Road; Lynton Road W; Longfield Estate; Alscot Road; Spa Road; Grange Road / Caledonian Market; Abbey Street; Druid Street; Tower Bridge")),
 ('188', 'Tottenham Court Road', S("Canada Water Bus Station; Neptune Street / St Olaves Estate; " + JRW + "; Tanner Street; Druid Street; Abbey Street; Grange Road / Caledonian Market; Bricklayer's Arms / Tower Bridge Road"),
  'North Greenwich', S("Bricklayer's Arms / Tower Bridge Road; Grange Road / Caledonian Market; Abbey Street; Druid Street; Boss Street; " + JRE + "; Neptune Street / St Olaves Estate; Surrey Quays Road; Canada Water Bus Station")),
 ('381', 'County Hall', S("Esmeralda Road; SPR/SJ; Anchor Street; Lynton Road E; Galleywall Road / South Bermondsey Station; Beamish House; Corbetts Lane; Warndon Street; Canada Water Bus Station; Rotherhithe Station; Rotherhithe Tunnel; " + JRW + "; Tanner Street; Boss Street; Unicorn Theatre"),
  'Peckham', S("Hay's Galleria; Abbots Lane; Unicorn Theatre; Tower Bridge Road; Boss Street; " + JRE + "; Rotherhithe Tunnel; Rotherhithe Station; Canada Water Bus Station; Warndon Street; Corbetts Lane; Rotherhithe New Road / South Bermondsey Station; Lynton Road E; Anchor Street; SPR/SJ; Esmeralda Road")),
 ('C10', 'Victoria', S("Rotherhithe Station; Rotherhithe Tunnel; Southwark Park; Drummond Road; Bermondsey Station; St James's Road; Old Jamaica Road; Maltby Street; The Grange; Bermondsey Street"),
  'Canada Water', S("Bermondsey Street; The Grange; Maltby Street; Old Jamaica Road; Jamaica Road / Abbey Street; Bermondsey Station; Drummond Road; Southwark Park; Rotherhithe Tunnel; Rotherhithe Station")),
 ('P12', 'Brockley Rise', S("Canada Water Bus Station; Neptune Street / St Olaves Estate; Southwark Park; Kirby Estate; Gataker Street; Raymouth Road; SPR/SJ; Esmeralda Road"),
  'Surrey Quays', S("Esmeralda Road; SPR/SJ; Anchor Street; Raymouth Road; Kirby Estate; Southwark Park; Neptune Street / St Olaves Estate; Surrey Quays Road; Canada Water Bus Station")),
]
BUS = D['furn']['bus']
HOP = {('Warndon Street', 'Canada Water Bus Station'), ('Canada Water Bus Station', 'Warndon Street')}
def points(n):
    if n == 'SPR/SJ': q = [b for b in BUS if b[2] in ("Southwark Park Road / St James's Road", "St James's Road / Southwark Park Road")]
    elif n.startswith('Lynton Road'): q = [b for b in BUS if b[2] == 'Lynton Road' and (b[0] > 1700) == n.endswith('E')]
    else: q = [b for b in BUS if b[2] == n]
    assert q, n
    return [(b[0], b[1]) for b in q]
def label(n): return {'SPR/SJ': "Southwark Park Road / St James's Road", 'Lynton Road E': 'Lynton Road', 'Lynton Road W': 'Lynton Road'}.get(n, n)
E = []
for a, b, poly, nm, w, main, *ow in D['edges']:
    p = [(poly[i], poly[i+1]) for i in range(0, len(poly), 2)]
    L = sum(math.dist(p[i], p[i+1]) for i in range(len(p)-1))
    off = any(x < 2 or y < 2 or x > D['W']-2 or y > D['H']-2 for x, y in p)
    E.append(dict(a=a, b=b, p=p, len=L, main=main, ow=(ow[0] if ow else 0) or 0, nm=D['names'][nm] if isinstance(nm, int) else nm, ok=bool(main and L > 2 and not off)))
ok_dir = lambda e, fw: not e['ow'] or (e['ow'] == 1) == fw
ADJ = {}
for i, e in enumerate(E):
    if e['ok']:
        for fw in (True, False):
            if ok_dir(e, fw): ADJ.setdefault(e['a'] if fw else e['b'], []).append((i, fw))
end = lambda i, fw: E[i]['b'] if fw else E[i]['a']
CACHE = {}
def tree(src):  # shortest paths over directed edges, from the end of src to the start of every other directed edge
    if src in CACHE: return CACHE[src]
    dist, prev, h = {}, {}, []
    def push(d, st, fr):
        if d < dist.get(st, 1e18): dist[st] = d; prev[st] = fr; heapq.heappush(h, (d, st))
    def succ(st):
        for nx in ADJ.get(end(*st), []):
            yield nx, (1500 if nx[0] == st[0] else 0)  # turning back on yourself: only if there is no other way
    for nx, pen in succ(src): push(pen, nx, src)
    while h:
        d, st = heapq.heappop(h)
        if d > dist[st]: continue
        for nx, pen in succ(st): push(d + E[st[0]]['len'] + pen, nx, st)
    CACHE[src] = (dist, prev); return CACHE[src]
def cands(n):
    out = {}
    for px, py in points(n):
        near = []
        for i, e in enumerate(E):
            if not e['ok']: continue
            acc = 0; best = None
            for k in range(len(e['p'])-1):
                (x0, y0), (x1, y1) = e['p'][k], e['p'][k+1]; L = math.dist((x0, y0), (x1, y1))
                if L < 1e-6: continue
                t = max(0, min(1, ((px-x0)*(x1-x0)+(py-y0)*(y1-y0))/L/L)); cx, cy = x0+(x1-x0)*t, y0+(y1-y0)*t; d = math.dist((px, py), (cx, cy))
                if best is None or d < best[0]: best = (d, acc+t*L, (x1-x0)/L, (y1-y0)/L, cx, cy)
                acc += L
            if best and best[0] < 260: near.append((best[0], i, best))
        near.sort()
        if near: near = [c for c in near if c[0] < max(45, near[0][0]+15)]   # a bus station off the road net uses the nearest road
        if near and near[0][0] >= 45: print('  far stop', n, (px, py), round(near[0][0]), 'px')
        for d, i, (_, s, hx, hy, cx, cy) in near[:8]:
            for fw in (True, False):
                if not ok_dir(E[i], fw): continue
                sg = 1 if fw else -1; left = (px-cx)*hy*sg - (py-cy)*hx*sg   # > 0: the stop is on the bus's left (UK)
                cost = max(0, d - near[0][0]) + (0 if left > 0 else 50)
                st = (i, fw, s if fw else E[i]['len']-s)
                if (i, fw) not in out or cost < out[(i, fw)][1]: out[(i, fw)] = (st, cost)
    assert out, ('no road near', n)
    return list(out.values())
EXIT = next((i, True) for i, e in enumerate(E) if e['nm'] == 'Rotherhithe New Road' and e['ok'] and e['p'][-1][0] > 3225)   # eastbound, to the map edge
ENTRY = (EXIT[0], False)
def step(a, b, na, nb):  # (cost, legs after a up to and including b's)
    if (na, nb) in HOP:
        if na == 'Warndon Street':          # drive to the map edge, appear on b's road
            d, path = leg(a, (EXIT[0], EXIT[1], E[EXIT[0]]['len']))
            return (1e9, None) if path is None else (d + 300, path + [b[:2]])
        d, path = leg((ENTRY[0], ENTRY[1], 0), b)   # leave from the bus station, appear at the map edge
        return (1e9, None) if path is None else (d + 300, [ENTRY] + path)
    return leg(a, b)
def leg(a, b):
    if a[:2] == b[:2] and b[2] >= a[2]: return b[2]-a[2], []
    dist, prev = tree(a[:2]); t = b[:2]
    if t not in dist: return 1e9, None
    path = [t]; v = prev[t]
    while v != a[:2]: path.append(v); v = prev[v]
    return E[a[0]]['len']-a[2] + dist[t] + b[2], path[::-1]
out = []
for num, d1, s1, d2, s2 in ROUTES:
    seq = s1 + s2; C = [cands(n) for n in seq]; best = None
    for start, sc in C[0]:
        row = [(sc, [start])]; prevC = [start]
        for k in range(1, len(seq)):
            nr = []
            for st, c in C[k]:
                nr.append(min(((row[j][0] + step(p, st, seq[k-1], seq[k])[0] + c, row[j][1] + [st]) for j, p in enumerate(prevC)), key=lambda z: z[0]))
            row = nr; prevC = [st for st, c in C[k]]
        for j, p in enumerate(prevC):
            tot = row[j][0] + step(p, start, seq[-1], seq[0])[0]
            if best is None or tot < best[0]: best = (tot, row[j][1])
    tot, chosen = best; assert tot < 1e8, num
    legs = [chosen[0][:2]]; stops = []; split = 0
    for k, st in enumerate(chosen):
        if k:
            _, path = step(chosen[k-1], st, seq[k-1], seq[k]); legs += path
        if k == len(s1): split = len(legs)-1
        stops.append([len(legs)-1, round(st[2], 1), label(seq[k])])
    _, path = step(chosen[-1], chosen[0], seq[-1], seq[0])
    if path: legs += path[:-1]           # drive back round to the first stop
    else:                                # the last stop is already on the first leg
        legs.pop()
        for st in stops:
            if st[0] == len(legs): st[0] = 0
    if len(stops) > 1 and stops[-1][2] == stops[0][2] and stops[-1][0] in (0, len(legs)-1): stops.pop()
    stops.sort(key=lambda z: (z[0], z[1]))
    uturn = sum(1 for k in range(len(legs)) if legs[k][0] == legs[(k+1) % len(legs)][0] and legs[k][1] != legs[(k+1) % len(legs)][1])
    for k in range(len(legs)):
        a, b = legs[k], legs[(k+1) % len(legs)]
        if end(*a) != (E[b[0]]['a'] if b[1] else E[b[0]]['b']): print('  jump after leg', k, E[a[0]]['nm'], '->', E[b[0]]['nm'])
        if a[0] == b[0] and a[1] != b[1]: print('  turns back after leg', k, E[a[0]]['nm'], E[a[0]]['p'][0])
    streets = []
    for i, fw in legs:
        n = E[i]['nm']
        if n and (not streets or streets[-1] != n): streets.append(n)
    print(num, 'stops', len(stops), 'legs', len(legs), 'km %.1f' % (sum(E[i]['len'] for i, _ in legs)/1.3/1000), 'uturns', uturn); print('   ', ' > '.join(streets))
    # destination shown: first direction up to the leg where the return stops begin
    out.append(dict(n=num, d=[d1, d2], split=split, legs=[i*2+(1 if fw else 0) for i, fw in legs], stops=stops))
open('js/busdata.js', 'w').write("""/* GTA Bermondsey: real bus routes (generated by tools/bus/build.py; do not edit by hand).
   Stop orders from bustimes.org, read 28 Nov 2026. legs: road-graph edge*2 + (1 if driven a to b); stops: [leg, distance along it, name];
   legs from `split` on are the return direction. */
const BUSDATA=""" + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
