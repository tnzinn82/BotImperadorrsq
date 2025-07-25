const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cria pasta auth se não existir
if (!fs.existsSync('./auth')) fs.mkdirSync('./auth');

// Gera settings.json padrão se não existir
const settingsPath = './settings.json';
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(settingsPath, JSON.stringify({
    nomeBot: "ImperadoresBot",
    prefixo: "!",
    numeroDono: "5521999999999"
  }, null, 2));
}

// Rota raiz - site com menu e botão ativar bot
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Imperadores - Gerador de Bot</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        background: linear-gradient(135deg, #1f005c, #5b0060);
        color: #fff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 0;
      }
      nav {
        background-color: rgba(0,0,0,0.6);
        padding: 1em 2em;
        font-style: italic;
        font-weight: bold;
        font-size: 2em;
        color: #0ff;
        overflow: hidden;
        white-space: nowrap;
        animation: typing 4s steps(20) infinite alternate;
        border-bottom: 3px solid #0ff;
        user-select: none;
      }
      @keyframes typing {
        from { width: 0; }
        to { width: 100%; }
      }
      main {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 50px 20px;
      }
      h1 {
        font-size: 3em;
        margin-bottom: 30px;
        text-shadow: 0 0 10px #0ff;
      }
      form {
        display: flex;
        flex-direction: column;
        width: 300px;
      }
      label {
        font-size: 1.1em;
        margin-bottom: 5px;
        text-align: left;
      }
      input {
        padding: 10px;
        font-size: 1em;
        margin-bottom: 20px;
        border-radius: 8px;
        border: none;
        outline: none;
      }
      button {
        padding: 15px;
        font-size: 1.3em;
        background: linear-gradient(90deg, #00ffe7, #0077ff);
        border: none;
        border-radius: 12px;
        color: #000;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px #00ffe7;
      }
      button:hover {
        background: linear-gradient(90deg, #0077ff, #00ffe7);
        box-shadow: 0 0 30px #0077ff;
      }
      @media (max-width: 500px) {
        main {
          padding: 30px 10px;
        }
        h1 {
          font-size: 2em;
        }
        form {
          width: 90%;
        }
      }
      .status {
        margin-top: 20px;
        font-weight: bold;
        font-size: 1.2em;
        color: #0ff;
      }
    </style>
  </head>
  <body>
    <nav>IMPERADORES</nav>
    <main>
      <h1>Gerador de Bot WhatsApp</h1>
      <form id="botForm" action="/download" method="POST">
        <label for="nomeBot">Nome do Bot</label>
        <input type="text" id="nomeBot" name="nomeBot" placeholder="ImperadoresBot" required />
        <label for="prefixo">Prefixo de Comando</label>
        <input type="text" id="prefixo" name="prefixo" placeholder="!" maxlength="3" required />
        <label for="numeroDono">Número do Dono (com DDI e DDD)</label>
        <input type="text" id="numeroDono" name="numeroDono" placeholder="5521999999999" pattern="\\d{10,15}" required />
        <button type="submit">Download / Ativar Bot</button>
      </form>
      <div class="status" id="status"></div>
    </main>

    <script>
      const form = document.getElementById('botForm');
      const status = document.getElementById('status');
      form.addEventListener('submit', async e => {
        e.preventDefault();
        status.textContent = "Iniciando...";
        const data = new URLSearchParams(new FormData(form));
        try {
          const res = await fetch('/download', {
            method: 'POST',
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: data
          });
          const text = await res.text();
          status.innerHTML = text;
        } catch (err) {
          status.textContent = "Erro ao iniciar o bot.";
        }
      });
    </script>
  </body>
  </html>
  `);
});

// POST que recebe configs, salva settings e inicia o bot
app.post('/download', async (req, res) => {
  const { nomeBot, prefixo, numeroDono } = req.body;

  // Validações básicas
  if (!nomeBot || !prefixo || !numeroDono) return res.status(400).send("Preencha todos os campos.");

  // Salva as configs no settings.json
  const config = { nomeBot, prefixo, numeroDono };
  fs.writeFileSync('./settings.json', JSON.stringify(config, null, 2));

  // Inicia o bot com configs novas
  try {
    await iniciarBot(config);
    res.send(`<span style="color:#0f0;">✅ Bot "${nomeBot}" iniciado com sucesso!<br>Prefixo: ${prefixo}<br>Dono: ${numeroDono}</span>`);
  } catch (e) {
    console.error(e);
    res.status(500).send("Erro ao iniciar o bot.");
  }
});

async function iniciarBot({ nomeBot, prefixo, numeroDono }) {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();

  const imp = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, new NodeCache())
    }
  });

  imp.ev.on('creds.update', saveCreds);

  imp.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[BOT] Conexão encerrada. Reconectar? ${shouldReconnect}`);
      if (shouldReconnect) iniciarBot({ nomeBot, prefixo, numeroDono });
    } else if(connection === 'open') {
      console.log(`[BOT] ${nomeBot} conectado com sucesso!`);
    }
  });

  imp.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    // Pega o texto da mensagem
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    // Se não começa com prefixo, ignora
    if (!body.startsWith(prefixo)) return;

    const args = body.slice(prefixo.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch(command) {
      case 'oi':
        await imp.sendMessage(msg.key.remoteJid, { text: `Fala meu cria! Eu sou o ${nomeBot}` });
        break;
      case 'menu':
        await imp.sendMessage(msg.key.remoteJid, { text: "📜 Comandos: !oi, !menu, !data" });
        break;
      case 'data':
        await imp.sendMessage(msg.key.remoteJid, { text: `🕒 Agora: ${new Date().toLocaleString()}` });
        break;
      default:
        await imp.sendMessage(msg.key.remoteJid, { text: `❌ Comando "${command}" não reconhecido.` });
    }
  });
}

// Inicia servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
