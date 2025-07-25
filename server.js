const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true }));

// HTML direto com CSS exagerado e responsivo
app.get('/', (_, res) => {
  res.send(`
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Gerador de Bot WhatsApp</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #ff00cc, #3333ff);
        font-family: 'Comic Sans MS', cursive, sans-serif;
        animation: pulse 5s infinite;
        color: white;
        text-align: center;
      }
      @keyframes pulse {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      h1 {
        font-size: 3em;
        text-shadow: 0 0 10px #fff, 0 0 20px #ff0;
        animation: escrever 5s steps(20) infinite alternate;
        white-space: nowrap;
        overflow: hidden;
        border-right: 3px solid white;
        width: 24ch;
        margin: auto;
      }
      @keyframes escrever {
        from { width: 0; }
        to { width: 24ch; }
      }
      form {
        margin-top: 50px;
      }
      input, button {
        padding: 15px;
        margin: 10px;
        border: none;
        border-radius: 10px;
        font-size: 1.2em;
      }
      button {
        background: yellow;
        color: black;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 0 20px yellow;
        transition: 0.3s;
      }
      button:hover {
        transform: scale(1.1);
      }
    </style>
  </head>
  <body>
    <h1>Gerador de Bot</h1>
    <form method="POST" action="/download">
      <input type="text" name="nomeBot" placeholder="Nome do Bot (ex: mary)" required />
      <button type="submit">Download</button>
    </form>
  </body>
  </html>
  `);
});

app.post('/download', async (req, res) => {
  const nomeBot = req.body.nomeBot.replace(/[^a-zA-Z0-9]/g, '') || 'meuBot';
  const pasta = `/tmp/${nomeBot}`;
  const botPath = path.join(pasta, 'bot.js');
  const settingsPath = path.join(pasta, 'settings.json');
  const packagePath = path.join(pasta, 'package.json');

  fs.mkdirSync(pasta, { recursive: true });

  fs.writeFileSync(botPath, `
// BOT COMPLETO usando whiskeysockets
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const imp = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  imp.ev.on('creds.update', saveCreds);

  imp.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const comando = body.trim().toLowerCase().split(" ")[0];

    switch (comando) {
      case '!menu':
        await imp.sendMessage(msg.key.remoteJid, { text: '🛠 MENU DO BOT:\\n!menu\\n!info\\n!dono' });
        break;
      case '!info':
        await imp.sendMessage(msg.key.remoteJid, { text: '🤖 Bot criado por você mesmo!' });
        break;
      case '!dono':
        await imp.sendMessage(msg.key.remoteJid, { text: '👑 Criado por você, o brabo!' });
        break;
      default:
        await imp.sendMessage(msg.key.remoteJid, { text: '❓ Comando não reconhecido!' });
    }
  });
}

iniciar();
`);

  fs.writeFileSync(settingsPath, JSON.stringify({
    prefix: "!",
    nome_bot: nomeBot,
    dono: "Você",
    comandos: ["!menu", "!info", "!dono"]
  }, null, 2));

  fs.writeFileSync(packagePath, JSON.stringify({
    name: nomeBot,
    version: "1.0.0",
    main: "bot.js",
    scripts: { start: "node bot.js" },
    dependencies: {
      "@whiskeysockets/baileys": "^6.7.0"
    }
  }, null, 2));

  const zipPath = path.join(__dirname, `${nomeBot}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip');

  output.on('close', () => {
    res.download(zipPath, `${nomeBot}.zip`, () => {
      fs.rmSync(pasta, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
    });
  });

  archive.pipe(output);
  archive.directory(pasta, false);
  archive.finalize();
});

app.listen(3000, () => console.log('✅ Gerador rodando em http://localhost:3000'));
