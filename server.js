const express = require('express');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Gerador de Bot - EQP IMP</title>
    <style>
      body {
        background: black;
        color: #0f0;
        font-family: monospace;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding: 20px;
      }
      input, button {
        background: #111;
        color: #0f0;
        border: 1px solid #0f0;
        padding: 10px;
        margin: 5px;
        width: 90%;
        max-width: 300px;
      }
      button {
        cursor: pointer;
        animation: blink 1s infinite;
      }
      @keyframes blink {
        0% { background-color: #111; }
        50% { background-color: #0f0; color: black; }
        100% { background-color: #111; }
      }
    </style>
  </head>
  <body>
    <h1>🧠 EQP IMP - GERADOR DE BOT</h1>
    <form action="/gerar" method="POST">
      <input type="text" name="nome" placeholder="Nome do Bot" required />
      <input type="text" name="prefixo" placeholder="Prefixo (!, ., /)" required />
      <input type="text" name="dono" placeholder="Número do Dono (DDDNÚMERO)" required />
      <button type="submit">🔨 Gerar Bot</button>
    </form>
  </body>
  </html>
  `);
});

app.post('/gerar', (req, res) => {
  const { nome, prefixo, dono } = req.body;
  const botName = nome.toLowerCase();

  // Arquivo settings.json
  const settings = {
    nome: nome,
    prefixo: prefixo,
    dono: dono,
    numerobot: "seunumeroaqui"
  };

  // Código do imperadores.js
  const botCode = `
const { makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { state, saveState } = useSingleFileAuthState('./auth.json');
const settings = require('./settings.json');

async function startBot() {
  const imperadores = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  imperadores.ev.on('messages.upsert', async (msg) => {
    try {
      const m = msg.messages[0];
      if (!m.message || m.key.fromMe) return;

      const body = m.message.conversation || m.message.extendedTextMessage?.text;
      if (!body || !body.startsWith(settings.prefixo)) return;

      const args = body.slice(settings.prefixo.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      switch (command) {
        case 'menu':
          await imperadores.sendMessage(m.key.remoteJid, { text: '🤖 Bot Ativo! Digite comandos após o prefixo.' });
          break;
        case 'criador':
          await imperadores.sendMessage(m.key.remoteJid, { text: \`👑 Dono: \${settings.dono}\` });
          break;
        default:
          await imperadores.sendMessage(m.key.remoteJid, { text: '❓ Comando não encontrado.' });
      }
    } catch (e) {
      console.error(e);
    }
  });

  imperadores.ev.on('creds.update', saveState);
}
startBot();
`;

  // package.json
  const packageJson = {
    name: botName,
    version: "1.0.0",
    main: "imperadores.js",
    scripts: {
      start: "node imperadores.js"
    },
    dependencies: {
      "@whiskeysockets/baileys": "^6.6.0"
    }
  };

  // Criar o ZIP
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.attachment(`${botName}-bot.zip`);

  archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' });
  archive.append(botCode, { name: 'imperadores.js' });
  archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });

  archive.finalize().pipe(res);
});

app.listen(PORT, () => {
  console.log(`✅ Gerador rodando: http://localhost:${PORT}`);
});
