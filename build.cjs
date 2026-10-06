const fs = require('node:fs');
fs.mkdirSync('public/data', { recursive: true });
for (const file of ['index.html', 'style.css', 'dark.css', 'playful.css', 'ai-crew-background.png', 'app.js', 'favicon.svg']) {
  fs.copyFileSync(file, 'public/' + file);
}
fs.copyFileSync('data/activity.json', 'public/data/activity.json');
