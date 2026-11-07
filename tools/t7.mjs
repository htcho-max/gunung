import { chromium } from 'playwright';
const SH = '/tmp/claude-0/-home-claude/ff6dc56c-7f85-5c18-b2ad-a3067656522b/scratchpad/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 520 } });
await p.goto('file:///home/claude/gunung/dist/index.html'); await p.click('#bNew'); await p.waitForTimeout(300);
await p.screenshot({ path: SH + 'setup.png' }); await b.close();
