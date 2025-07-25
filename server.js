const express = require('express');
const archiver = require('archiver');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Página inicial com o formulário
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gerador de Bot Imperadores</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #121212;
        color: #00ffcc;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        flex-direction: column;
      }
      h1 {
        margin-bottom: 20px;
        font-style: italic;
        animation: typing 3s steps(20) infinite alternate;
        white-space: nowrap;
        overflow: hidden;
        border-right: 3px solid #00ffcc;
      }
      @keyframes typing {
        from { width: 0 }
        to { width: 12ch }
      }
      form {
        background: #222;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 0 15px #00ffcc;
        width: 90%;
        max-width: 400px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
      }
      input {
        width: 100%;
        padding: 10px;
        margin-bottom: 20px;
        border-radius: 8px;
        border: none;
        outline: none;
        font-size: 1em;
      }
      button {
        width: 100%;
        padding: 12px;
        background: linear-gradient(90deg, #00ffcc, #008080);
        border: none;
        border-radius: 12px;
        font-weight: bold;
        cursor: pointer;
        color: #000;
        font-size: 1.1em;
        transition: 0.3s;
      }
      button:hover {
        background: linear-gradient(90deg, #008080, #00ffcc);
      }
    </style>
  </head>
  <body>
    <h1>Imperadores - Gerador de Bot</h1>
    <form action="/generate" method="POST">
      <label for="botName">Nome do Bot:</label>
      <input type="text" id="botName" name="botName" placeholder="Ex: Imperadores" required />

      <label for="prefix">Prefixo dos Comandos:</label>
      <input type="text" id="prefix" name="prefix" placeholder="Ex: !" maxlength="2" required />

      <label for="ownerNumber">Número do Dono (com DDI + DDD):</label>
      <input type="text" id="ownerNumber" name="ownerNumber" placeholder="Ex: 5511999999999" pattern="\\d{10,15}" required />

      <button type="submit">Download do Bot</button>
    </form>
  </body>
  </html>
  `);
});

// Rota que gera e envia o ZIP do bot
app.post('/generate', (req, res) => {
  const { botName, prefix, ownerNumber } = req.body;

  if (!botName || !prefix || !ownerNumber) {
    return res.status(400).send('Todos os campos são obrigatórios!');
  }

  // Conteúdo do bot.js dinamicamente gerado
  const botJS = `const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');

const settings = require('./settings.json');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const imp = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  imp.ev.on('creds.update', saveState);

  imp.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      if(statusCode !== DisconnectReason.loggedOut) {
        console.log('Reconectando...');
        startBot();
      } else {
        console.log('Desconectado, reinicie o bot manualmente.');
      }
    } else if(connection === 'open') {
      console.log(\`\${settings.botName} está online!\`);
    }
  });

  imp.ev.on('messages.upsert', async (msgUpdate) => {
    if(!msgUpdate.messages) return;
    const msg = msgUpdate.messages[0];
    if(!msg.message || msg.key.fromMe) return;

    const messageType = Object.keys(msg.message)[0];
    if(messageType !== 'conversation' && messageType !== 'extendedTextMessage') return;

    const text = messageType === 'conversation' ? msg.message.conversation : msg.message.extendedTextMessage.text;
    if(!text.startsWith(settings.prefix)) return;

    const commandBody = text.slice(settings.prefix.length).trim();
    const args = commandBody.split(/\\s+/);
    const command = args.shift().toLowerCase();

    const from = msg.key.remoteJid;

    console.log(\`Comando recebido: \${command} de \${from}\`);

    switch(command) {
      case 'ping':
        await imp.sendMessage(from, { text: 'Pong!' }, { quoted: msg });
        break;
      case 'info':
        await imp.sendMessage(from, { text: \`Bot: \${settings.botName}\\nPrefixo: \${settings.prefix}\\nDono: \${settings.ownerNumber}\` }, { quoted: msg });
        break;
      case 'help':
        await imp.sendMessage(from, { text: \`Comandos disponíveis:\\n\${settings.prefix}ping\\n\${settings.prefix}info\\n\${settings.prefix}help\` }, { quoted: msg });
        break;
      default:
        await imp.sendMessage(from, { text: \`Comando desconhecido: \${command}\\nUse \${settings.prefix}help para ajuda.\` }, { quoted: msg });
    }
  });
}

startBot();
`;

  // Conteúdo settings.json gerado
  const settingsJSON = JSON.stringify({
    botName,
    prefix,
    ownerNumber
  }, null, 2);

  // package.json fixo com libs necessárias
  const packageJSON = `{
  "name": "imperadores-bot",
  "version": "1.0.0",
  "description": "Bot WhatsApp simples com whiskeysockets/baileys",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^4.6.0",
    "pino": "^8.0.0"
  }
}
`;

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': \`attachment; filename="\${botName.toLowerCase().replace(/\\s+/g,'_')}_bot.zip"\`
  });

  const archive = archiver('zip');

  archive.pipe(res);

  archive.append(botJS, { name: 'bot.js' });
  archive.append(settingsJSON, { name: 'settings.json' });
  archive.append(packageJSON, { name: 'package.json' });

  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`GERADOR DE BOT PRA IMPERADORES ONLINE 😀`);
});
