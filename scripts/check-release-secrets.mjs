import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {extname} from 'node:path';

const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw new Error('Stage the intended release files before checking them.');
const secrets=new Set();
for(const envFile of ['.env.local','.env.release']){
  if(!existsSync(envFile))continue;
  for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){
    const m=/^([A-Z0-9_]+)=(.*)$/.exec(line);if(!m||!/(SECRET|API_KEY|TOKEN|PASSWORD|DATABASE_URL|POSTGRES_URL|DEMO_ACCESS_CODE)/.test(m[1]))continue;
    let value=m[2].trim();try{value=JSON.parse(value);}catch{value=value.replace(/^['"]|['"]$/g,'');}
    if(typeof value==='string'&&value.length>=10)secrets.add(value);
  }
}
const violations=[];
for(const file of files){
  if(/(^|\/)(\.env(?!\.example$)|data\/|\.vercel\/|node_modules\/)|\.(sqlite|log)(\.|$)/.test(file))violations.push(`${file}: private runtime file`);
  if(['.png','.jpg','.jpeg','.webp','.gif','.ico'].includes(extname(file).toLowerCase()))continue;
  const content=readFileSync(file,'utf8');
  if([...secrets].some(secret=>content.includes(secret)))violations.push(`${file}: configured secret value`);
  if(/\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/.test(content))violations.push(`${file}: possible API credential`);
}
if(violations.length){console.error(violations.join('\n'));process.exitCode=1;}
else console.log(`Release scan passed for ${files.length} tracked/staged files. No configured secret values or private runtime files found. Secret values were not printed.`);
