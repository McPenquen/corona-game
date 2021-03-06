import * as yargs from 'yargs';
import * as path from 'path';
import {readdirSync, readFileSync, writeFileSync} from 'fs';

const argv = yargs
  .usage('Usage: $0 -d <directory>')
  .demandOption('d')
  .alias('d', 'directory')
  .help('h')
  .alias('h', 'help')
  .parse(process.argv);

const langs = {} as Record<string, any>;

['events', 'extract'].forEach(source => {
  const sourceDir = path.join(argv.directory as string, source);
  readdirSync(sourceDir).forEach(langFile => {
    if (langFile.endsWith('.json')) {
      const lang = langFile.slice(0, -5);
      const langData = JSON.parse(readFileSync(path.join(sourceDir, langFile), 'utf8'));
      langs[lang] = {...langs[lang], ...langData};
    }
  });
});

const pageFilePattern = /^(?<pageName>[a-z,0-9,_,\-]+(\.help)?)\.(?<lang>[a-z]+)\.html$/;
const pagesDir = path.join(argv.directory as string, 'pages');
const pages = readdirSync(pagesDir).filter(filename => pageFilePattern.test(filename));

pages.forEach(pageFile => {
  const {pageName, lang} = pageFile.match(pageFilePattern)!.groups as {pageName: string, lang: string};
  const pageData = readFileSync(path.join(pagesDir, pageFile), 'utf8');
  langs[lang][pageName + '.html'] = pageData.replace(/\n/g, ' ');
});

for (const lang in langs) {
  writeFileSync(path.join(argv.directory as string, lang + '.json'), JSON.stringify(langs[lang], null, '  '), 'utf8');
}
