// Bundles index.html + css + js into dist/titan-capital-single.html (one file, same game)
const fs = require('fs'), path = require('path');
let h = fs.readFileSync('index.html', 'utf8');
h = h.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, p) => '<style>\n' + fs.readFileSync(p, 'utf8') + '</style>');
h = h.replace(/<script src="([^"]+)"><\/script>/g, (m, p) => '<script>\n' + fs.readFileSync(p, 'utf8') + '</script>');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'titan-capital-single.html'), h);
console.log('built dist/titan-capital-single.html', h.length, 'bytes');
