/* Sitenin sözlüklerini (js/i18n.js + js/i18n/<kod>.js) JSON olarak basar; tools/statik.py kullanır.
   node tools/sozluk_dok.js <site kökü> */
const fs = require('fs'), vm = require('vm'), path = require('path');
const kok = process.argv[2] || '.';
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(kok, 'js/i18n.js'), 'utf8'), ctx);
for (const f of fs.readdirSync(path.join(kok, 'js/i18n')).filter((f) => f.endsWith('.js'))) {
  vm.runInContext(fs.readFileSync(path.join(kok, 'js/i18n', f), 'utf8'), ctx);
}
process.stdout.write(JSON.stringify(ctx.window.RB_I18N));
