// Use the repository incremental migration executor; no application-side DDL.
require('child_process').execFileSync(process.execPath,[require('path').join(__dirname,'run-incremental-migrations.js')],{stdio:'inherit'});
