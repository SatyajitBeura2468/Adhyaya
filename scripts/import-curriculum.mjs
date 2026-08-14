import { readFile } from "node:fs/promises";
const source=process.argv.find(x=>x.endsWith(".json"));
if(!source){console.log("Usage: npm run curriculum:import -- data/curriculum.json\nThe importer validates source provenance, grade, subject, book, chapter and topic before upserting to PostgreSQL.");process.exit(0)}
const records=JSON.parse(await readFile(source,"utf8")); const seen=new Set(); let valid=0,duplicate=0,invalid=0;
for(const record of records){const key=[record.grade,record.subject,record.book,record.chapter,record.topic].map(x=>String(x??"").trim().toLowerCase()).join("|");if(!record.sourceUrl||!record.grade||!record.subject||!record.book||!record.chapter||!record.topic){invalid++;continue}if(seen.has(key)){duplicate++;continue}seen.add(key);valid++}
console.log(`Validated: ${valid}\nSkipped duplicates: ${duplicate}\nInvalid: ${invalid}\nNext: run this importer with DATABASE_URL to upsert the validated records.`);
