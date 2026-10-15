// Explicit, opt-in real Surge execution. Reports remain local and gitignored.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const variant=process.argv[2];
const action=process.argv[3] || '';
if(!['mayihei','web','xykt'].includes(variant) || !/^[a-z]*$/.test(action)) throw Error('Usage: node scripts/live-check.js mayihei|web|xykt [action]');
const directory=path.join(root,'.verification');fs.mkdirSync(directory,{recursive:true});
const prefix='var $argument = "policy=✈️ 我的节点（所有订阅）&mask=true&media=false";\n'+(action?'var $request = '+JSON.stringify({url:'http://ipquality.surge.local/'+variant+'/'+action,method:'POST',headers:{}})+';\n':'');
const driver=path.join(directory,variant+'-'+(action||'panel')+'.js');
fs.writeFileSync(driver,prefix+fs.readFileSync(path.join(root,'modules/network-diagnostics/ipquality-'+variant+'/report.js'),'utf8'));
const output=execFileSync('/Applications/Surge.app/Contents/Applications/surge-cli',['script','evaluate',driver,'generic','55'],{timeout:60000,encoding:'utf8'});
fs.writeFileSync(path.join(directory,variant+'-'+(action||'panel')+'.txt'),output);
const match=output.match(/Result:\s*([\s\S]*?)\nLog:/);
if(!match)throw Error('No result returned');
const result=JSON.parse(match[1]);
if(result.response){
 fs.writeFileSync(path.join(directory,variant+'-'+action+'.html'),result.response.body);
 console.log(JSON.stringify({variant,action,status:result.response.status,htmlBytes:Buffer.byteLength(result.response.body)}));
}else console.log(JSON.stringify({variant,content:result.content}));
