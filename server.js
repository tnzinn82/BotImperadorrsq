const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const archiver = require('archiver');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Gerador de Bot Imperadores</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          background: #0e0e0e;
          color: #fff;
          font-family: Arial, sans-serif;
          padding: 20px;
          text-align: center;
        }
        h1 span::after {
          content: '';
          animation: digitaApaga 4s infinite;
        }
        @keyframes digitaApaga {
          0%, 100% { content: 'IMPERADORES'; }
          50% { content: ''; }
        }
        input, button {
          margin: 10px;
          padding: 10px;
          border-radius: 5px;
          border: none;
          font-size: 16px;
        }
        input {
          width: 80%;
          max-width: 300px;
        }
        button {
          background: #28a745;
          color: white;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1><span></span></h1>
      <form action="/download" method="post">
        <input name="nomebot" placeholder="Nome do bot (ex: imperadores)" required><br>
        <input name="prefixo" placeholder="Prefixo (ex: !)" required><br>
        <input name="dono" placeholder="Número do dono (com DDI)" required><br>
        <button type="submit">Download</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/download', async (req, res) => {
  const { nomebot, prefixo, dono } = req.body;

  const botCode = `
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const start = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('${nomebot}_auth');
  const imp = makeWASocket({ auth: state, printQRInTerminal: true });

  imp.ev.on('creds.update', saveCreds);

  imp.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const comando = body.trim().toLowerCase().split(/\\s+/)[0];

    switch (comando) {
      case '${prefixo}ping':
        await imp.sendMessage(from, { text: '🏓 Pong!' });
        break;

      case '${prefixo}dono':
        await imp.sendMessage(from, { text: '👑 Dono: wa.me/${dono}' });
        break;

      default:
        console.log('Comando não reconhecido:', comando);
    }
  });

  imp.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (motivo === DisconnectReason.loggedOut) {
        console.log('Sessão encerrada');
        fs.rmSync('${nomebot}_auth', { recursive: true, force: true });
      } else {
        start();
      }
    }
  });
};

start();
  `;

  // Cria o arquivo .js
  fs.writeFileSync(`${nomebot}.js`, botCode);

  // Cria o .zip
  const output = fs.createWriteStream(`${nomebot}.zip`);
  const archive = archiver('zip');
  archive.pipe(output);
  archive.file(`${nomebot}.js`, { name: `${nomebot}.js` });
  archive.finalize();

  output.on('close', () => {
    res.download(`${nomebot}.zip`, () => {
      fs.unlinkSync(`${nomebot}.zip`);
      fs.unlinkSync(`${nomebot}.js`);
    });
  });
});

app.listen(port, () => {
  console.log(`✅ Gerador rodando em http://localhost:${port}`);
});
