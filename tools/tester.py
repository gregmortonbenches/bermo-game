"""GTA Bermondsey play-tester.
Plays the game headlessly in many short sessions and writes report.md + contact sheets of what it saw.
Checks: JS errors, load time, frame rate, getting stuck while walking, walking through walls, every
context action it meets, driving (does the car move / get stuck), helicopter take-off/landing, NPC
and car counts, things in silly places (trees/parked cars/furniture in the carriageway), and random
street-level screenshots by day and night for a human-style visual critique."""
import asyncio, json, random, sys, time, math, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/tester/run'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 12
SEED = int(sys.argv[3]) if len(sys.argv) > 3 else int(time.time())
os.makedirs(OUT, exist_ok=True); random.seed(SEED)
CHROME = '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'
issues = []; shots = []; metrics = {}
def issue(kind, msg, where=None): issues.append({'kind': kind, 'msg': msg, 'where': where})

async def session(pg, i):
    # random walkable spot near the centre of the map
    spot = await pg.evaluate("""(()=>{for(let k=0;k<200;k++){const x=300+Math.random()*2300,y=600+Math.random()*1700;if(walkable(tAt(x,y))&&!hit(x,y,3)&&!(typeof hitW=='function'&&hitW(x,y))&&!WD.trees.some(t=>Math.hypot(t[0]-x,t[1]-y)<9))return{x,y}/* not under a tree crown */}return null})()""")
    if not spot: return
    await pg.evaluate(f"pl.x={spot['x']};pl.y={spot['y']};pl.z=0;if(pl.car)leaveCar()")
    where = [round(spot['x']), round(spot['y'])]
    street = await pg.evaluate("(typeof streetAt=='function'?streetAt(pl.x,pl.y):'')||''")
    # walk: random direction, measure progress; report if stuck or if we end up inside a building
    stuck = 0
    for leg in range(4):
        await pg.evaluate("for(const k in K)K[k]=0")
        key = random.choice(['up', 'left', 'right', 'down'])
        await pg.evaluate(f"CAM.yaw={random.random()*6.28};K['{key}']=1")
        p0 = await pg.evaluate("[pl.x,pl.y]"); await pg.evaluate("for(let i=0;i<60;i++)step(1,1/60)"); p1 = await pg.evaluate("[pl.x,pl.y]")
        if math.hypot(p1[0]-p0[0], p1[1]-p0[1]) < 1.5: stuck += 1
        metrics.setdefault('walk_px_per_s', []).append(round(math.hypot(p1[0]-p0[0], p1[1]-p0[1])))
        inside = await pg.evaluate("hit(pl.x,pl.y,.2)")
        if inside: issue('collision', 'Player ended up inside a solid cell (walked through something)', [round(p1[0]), round(p1[1])])
    await pg.evaluate("for(const k in K)K[k]=0")
    if stuck >= 3: issue('movement', f'Player stuck in 3+ of 4 walking directions', where)
    # context actions nearby
    act = await pg.evaluate("(()=>{const a=ctxAct();return a?a.l:null})()")
    if act:
        try:
            await pg.evaluate("(()=>{const a=ctxAct();a&&a.f()})()")
            await pg.wait_for_timeout(300)
            dl = await pg.evaluate("!!DL")
            if dl:
                txt = await pg.evaluate("document.querySelector('#dlg')?document.querySelector('#dlg').innerText.slice(0,160):''")
                metrics.setdefault('dialogs', []).append([act, txt.replace('\n', ' | ')])
                await pg.evaluate("closeDlg()")
        except Exception as e: issue('action', f'Action "{act}" threw: {e}', where)
    # screenshots: street level, two headings, alternating day/night
    hour = 13 if i % 3 else 21
    # pick screenshot headings with open space in front (camera looks along (sin h, -cos h)); avoids shots of a wall from 1 m
    free = await pg.evaluate("""(()=>{const o=[];for(let k=0;k<24;k++){const h=k/24*6.2832;let d=0;for(d=2;d<=30;d+=2)if(hit(pl.x+Math.sin(h)*d,pl.y-Math.cos(h)*d,.5))break;o.push([h,d])}return o})()""")
    best = max(d for _, d in free); open_h = [h for h, d in free if d >= min(16, best)]
    h0 = random.choice(open_h); far = [x for x in open_h if abs(math.remainder(x - h0, 6.2832)) > 1.2]  # second shot looks a different way
    for h in (h0, None):
        hh = h if h is not None else random.choice(far or open_h)
        await pg.evaluate(f"""(()=>{{const K=1/1.3,x=pl.x*K,z=pl.y*K,h={hh};window.DBGH={hour};window.DBGFOV=70;window.DBGCAM=[x,1.7,z,x+Math.sin(h)*30,1.4,z-Math.cos(h)*30]}})()""")
        await pg.wait_for_timeout(2600 if h is not None else 1300)  # first shot after a DBGH change needs longer to settle
        fn = f'{OUT}/s{i:02d}_{len(shots)%2}.jpg'; await pg.screenshot(path=fn, type='jpeg', quality=70)
        shots.append((fn, f'#{i} {street} {where} {"day" if hour==13 else "night"}'))
    await pg.evaluate("window.DBGCAM=null;window.DBGH=null")

async def drive_test(pg):
    # borrow several traffic cars and drive straight: check they get up to speed and how far they go before bumping into something
    res = await pg.evaluate("""(()=>{const out=[];const cs=[];for(const c of cars)if(c.ai&&c.type=='hatch'&&!hit(c.x,c.y,1.1)&&cs.every(o=>Math.hypot(o.x-c.x,o.y-c.y)>40)&&cs.length<8)cs.push(c);/* spaced apart so a previously borrowed car left in the lane doesn't block the next one */
      for(const c of cs){c.ai=false;c.v=0;pl.x=c.x;pl.y=c.y;enterCar(c);const x0=c.x,y0=c.y;let vmax=0,bumpAt=null,onRoad=null;const ca=Math.cos(c.a),sa=Math.sin(c.a);let ahead=null;for(const o of cars){if(o===c)continue;const dx=o.x-c.x,dy=o.y-c.y,ah=dx*ca+dy*sa;if(ah>0&&ah<25&&Math.abs(-dx*sa+dy*ca)<6&&(!ahead||ah<ahead[0]))ahead=[Math.round(ah),o.ai?'traffic':o.own?'own':o.tested?'tested':'kerb-parked',Math.round(Math.cos(o.a-c.a)*100)/100]}/* what's in the lane ahead, for diagnosing cars that never get going */K.up=1;
        for(let i=0;i<180;i++){const v0=c.v;step(1,1/60);vmax=Math.max(vmax,c.v);if(v0>.2&&c.v<0&&bumpAt==null){bumpAt=Math.round(Math.hypot(c.x-x0,c.y-y0));const t=tAt(c.x+Math.cos(c.a)*7,c.y+Math.sin(c.a)*7);onRoad=(t==1||t==7)}}
        K.up=0;out.push({vmax:+vmax.toFixed(2),bumpAt,onRoad,ahead,at:[Math.round(x0),Math.round(y0)]});leaveCar();c.tested=1}return out})()""")
    metrics['drive'] = res
    for r in res:
        if r['vmax'] < .3: issue('driving', f"Borrowed car never got up to speed (max {r['vmax']})" + (f"; in the lane ahead: {r['ahead'][1]} car {r['ahead'][0]} px away, heading cos {r['ahead'][2]}" if r.get('ahead') else ''), r['at'])
        elif r['bumpAt'] is not None and r['bumpAt'] < 25:
            # with no steering a car runs off the road on bends; only an obstacle in the carriageway itself is a real problem
            if r.get('onRoad'): issue('driving', f"Car hit something in the carriageway only {r['bumpAt']}px (~{r['bumpAt']/1.3:.0f} m) after setting off", r['at'])
            else: metrics['ran_off_road_unsteered'] = metrics.get('ran_off_road_unsteered', 0) + 1

async def borrow_test(pg):
    # core check: standing next to a stopped traffic hatchback offers "Ask to borrow"
    r = await pg.evaluate("""(()=>{if(pl.car)leaveCar();for(const c of cars){if(!(c.ai&&c.type=='hatch')||hit(c.x,c.y,1.1))continue;c.v=0;const a=c.a+1.57;pl.x=c.x+Math.cos(a)*3;pl.y=c.y+Math.sin(a)*3;pl.z=0;const x=ctxAct();if(x&&x.l=='Ask to borrow')return 'ok'}return 'none'})()""")
    metrics['borrow_prompt'] = r
    if r != 'ok': issue('borrow', 'No "Ask to borrow" prompt next to any stopped hatchback')

async def heli_test(pg):
    await pg.evaluate("pl.x=heli.x+4;pl.y=heli.y;enterCar(heli);K.hup=1;for(let i=0;i<150;i++)step(1,1/60)")
    a = await pg.evaluate("heli.alt*55"); await pg.evaluate("K.hup=0;K.up=1;for(let i=0;i<90;i++)step(1,1/60)")
    await pg.evaluate("K.up=0;K.brake=1;for(let i=0;i<400;i++)step(1,1/60);K.brake=0")
    l = await pg.evaluate("[heli.landed,ctxAct().l]"); metrics['heli'] = {'alt_after_climb_m': round(a, 1), 'landed': l}
    if a < 5: issue('heli', 'Helicopter barely climbs')
    if not l[0]: issue('heli', 'Helicopter did not land after 5s of descending')
    await pg.evaluate("ctxAct().f()")

async def static_checks(pg):
    s = await pg.evaluate("""(()=>{const o={};o.cars=cars.length;o.peds=peds.length;
      // street furniture, trees, fronts sanity
      let tr=0;for(const t of WD.trees){let all=true;for(const [dx,dy] of [[0,0],[4,0],[-4,0],[0,4],[0,-4]])if(tAt(t[0]+dx,t[1]+dy)!=1)all=false;if(all)tr++}o.treesInCarriageway=tr;
      o.fronts=R3DBG.fronts;o.lamps=R3DBG.lamps&&R3DBG.lamps.length;o.svcLamps=R3DBG.svcLamps;o.sqLamps=R3DBG.sqLamps;o.parked=R3DBG.parked;o.plazaTrees=R3DBG.plzt;o.planters=R3DBG.planters;o.blueStalls=R3DBG.blueStalls;return o})()""")
    metrics.update(s)
    # (trees whose trunk is in the carriageway are skipped by the renderer, so this is informational)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width': 640, 'height': 400})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: r.status >= 400 and not r.url.endswith('favicon.ico') and 'open-meteo' not in r.url and errs.append(f'HTTP {r.status} {r.url}'))
        t0 = time.time(); await pg.goto('http://localhost:8768/index.html'); await pg.wait_for_function('ready===true', timeout=120000)
        metrics['load_s'] = round(time.time()-t0, 1)
        await pg.evaluate("startGame()"); await pg.wait_for_timeout(600); await pg.evaluate("if(DL)closeDlg();document.getElementById('ui').style.display='none'")
        metrics['sim_ms_per_step'] = await pg.evaluate("(()=>{const t=performance.now();for(let i=0;i<120;i++)step(1,1/60);return Math.round((performance.now()-t)/120*100)/100})()")
        await static_checks(pg)
        for i in range(N):
            try: await session(pg, i)
            except Exception as e: issue('crash', f'session {i}: {e}')
        try: await borrow_test(pg)  # before the drive test, which takes stopped hatchbacks out of traffic
        except Exception as e: issue('borrow', f'borrow test threw: {e}')
        try: await drive_test(pg)
        except Exception as e: issue('driving', f'drive test threw: {e}')
        try: await heli_test(pg)
        except Exception as e: issue('heli', f'heli test threw: {e}')
        for e in errs[:20]: issue('js-error', e)
        await b.close()
    # contact sheets
    for k in range(0, len(shots), 8):
        W = Image.new('RGB', (1280, 1600), 'white'); d = ImageDraw.Draw(W)
        for j, (fn, cap) in enumerate(shots[k:k+8]):
            x, y = (j % 2)*640, (j//2)*400; W.paste(Image.open(fn), (x, y)); d.rectangle([x, y, x+330, y+16], fill='black'); d.text((x+3, y+2), cap[:52], fill='yellow')
        W.save(f'{OUT}/sheet{k//8}.jpg', quality=75)
    rep = [f'# Play-test report (seed {SEED}, {N} sessions)', '', '## Metrics', '```', json.dumps(metrics, indent=1)[:3000], '```', '', '## Automatic issues']
    rep += [f"- [{x['kind']}] {x['msg']}" + (f" at {x['where']}" if x['where'] else '') for x in issues] or ['- none']
    rep += ['', '## Screens to review', *[f'- {c}: {f}' for f, c in shots]]
    open(f'{OUT}/report.md', 'w').write('\n'.join(rep)); print('\n'.join(rep[:60]))
asyncio.run(main())
