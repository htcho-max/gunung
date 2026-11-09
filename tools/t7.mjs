import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const SH = SHOTS;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 520 } });
await p.goto(GAME); await p.click('#bNew'); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'setup.png' }); await b.close();
