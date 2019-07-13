const { Composer } = require('micro-bot');
const escape = require('escape-html');
const child_process = require('child_process');
const fs = require('fs');
const { JSDOM } = require("jsdom");

// the bot
const bot = new Composer();

// start command
bot.command('/start', async ({ from, replyWithMarkdown, botInfo }) =>
  replyWithMarkdown(`Hi *${from.first_name || from.username}*!
To shitpost, type @${botInfo.username} and type the text you want to overlay over crab rave.
This was made by @boringcactus in one afternoon when she was bored.
This bot isn't super reliable but the source is at https://glitch.com/edit/#!/${process.env.PROJECT_DOMAIN}`));

// inline query for music search
bot.on('inline_query', async ({ inlineQuery, answerInlineQuery }) => {
  const query = inlineQuery.query || '';
  console.log('Got query', query);
  if (query.length > 1) {
    const result = [
      {
        type: "video",
        id: "a",
        video_url: "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/video/" + encodeURIComponent(query) + ".mp4",
        mime_type: "video/mp4",
        thumb_url: "https://i.kym-cdn.com/entries/icons/original/000/026/904/eoin-o-broin-06.jpg",
        title: query
      }
    ];
    // const result = await spotifySearch(query);
    return answerInlineQuery(result);
  }
});

try {
  fs.mkdirSync('/tmp/video', {recursive: true});
} catch (e) {
  // ignore error
}

module.exports = {
  bot,
  server(req, res) {
    if (req.url === '/') {
      res.end(`
        <html>
          <head>
            <title>CCHEBANFLEX</title>
          </head>
          <body>
            <h1>it's a tool for adding things to crab rave</h1>
            <form action="/add-text" method="GET">
              <input type="text" name="text" placeholder="text">
              <input type="submit" value="Overlay!">
            </form>
            <a href="https://t.me/chebanflex_bot">also available as a Telegram bot</a>
          </body>
        </html>
      `);
    } else if (req.url.startsWith('/add-text')) {
      const data = require('url').parse(req.url, true).query.text;
      res.writeHead(303, {
        'Location': "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/video/" + encodeURIComponent(data) + ".mp4"
      });
      res.end();
    } else if (req.url.startsWith('/video/')) {
      const match = /^\/video\/(.*)\.mp4$/.exec(req.url);
      const text = decodeURIComponent(match[1]);
      console.log('Match:', text);
      const path = require('path').join('/tmp', req.url);
      res.setHeader('Content-Type', 'video/mp4');
      console.log('Name:', path);
      if (!fs.existsSync(path)) {
        const dom = new JSDOM(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg version="1.1" viewBox="0 0 848 480">
</svg>`, {contentType: 'image/svg+xml'});
        const document = dom.window.document;
        const lines = text.split('\n');
        let y = 300 - (75 * lines.length) / 2;
        for (let line of lines) {
          const lineNode = document.createElement('text');
          lineNode.setAttribute('x', 424);
          lineNode.setAttribute('y', y);
          y += 75;
          lineNode.setAttribute('style', "text-anchor:middle;alignment-baseline:middle;font-family:'DejaVu Sans',sans-serif;font-weight:bold;font-size:48pt;fill:white;stroke:black;stroke-width:1px;");
          lineNode.textContent = line;
          document.querySelector('svg').append(lineNode);
        }
        const svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + dom.serialize();
        fs.writeFileSync(path + '.svg', svg);
        child_process.spawnSync('convert', ['-background', 'none', path + '.svg', path + '.png'], {stdio: ['inherit', 'inherit', 'inherit']});
        const child = child_process.spawnSync(
          'ffmpeg',
          ['-i', 'https://cdn.glitch.com/70ea37b5-d264-46e5-a1db-29c786c86515%2FCrabRaveQuieter.mp4?1548223581701',
           '-i', path + '.png',
           //'-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf: font='DejaVu Sans': text='${text}': fontcolor=white: fontsize=48: box=1: boxcolor=black@0.5: boxborderw=5: x=(w-text_w)/2: y=(h-text_h)/2`,
           '-filter_complex', 'overlay=x=0:y=0',
           '-c:v', 'libx264', '-preset', 'superfast', '-crf', '27', '-f', 'mp4', '-c:a', 'copy', '-y', path],
          {
            stdio: ['inherit', 'inherit', 'inherit']
          }
        );
      }
      fs.createReadStream(path).pipe(res);
    }
  },
};
