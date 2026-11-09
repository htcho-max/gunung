import { GAME, SHOTS } from './env.mjs';
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.stack));
await p.goto(GAME);
await p.mouse.click(400, 300); await p.waitForTimeout(500);
const r = await p.evaluate(async () => {
  const out = [];
  out.push('title ' + BGM.mood + ' ' + !!SFX.ctx + ' ' + (SFX.ctx && SFX.ctx.state));
  BGM.play('battle'); await new Promise(r => setTimeout(r, 2500)); out.push('battle step ' + BGM.step);
  BGM.play('map'); await new Promise(r => setTimeout(r, 2500)); out.push('map step ' + BGM.step + ' ' + BGM.mood);
  BGM.toggle(); out.push('off ' + BGM.on + ' ' + BGM.timer); BGM.toggle(); out.push('on ' + BGM.on + ' ' + BGM.mood);
  return out;
});
console.log(r.join('\n'), 'ERR', errs); await b.close();
