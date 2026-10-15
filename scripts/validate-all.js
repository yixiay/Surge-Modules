const {spawnSync} = require('node:child_process');
const path = require('node:path');
for (const name of ['mayihei','web','xykt']) {
  const file=path.resolve(__dirname, '../modules/network-diagnostics/ipquality-'+name+'/module.sgmodule');
  const r=spawnSync(process.execPath,[path.resolve(__dirname,'../tests/validate-module-lsp.js'),file],{stdio:'inherit',timeout:10000});
  if(r.status!==0) process.exit(1);
}
