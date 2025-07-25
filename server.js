const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

// Página HTML
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>Gerador de Bot</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: linear-gradient(to right, #0f0c29, #302b63, #24243e);
        color: white;
        font-family: 'Segoe UI', sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 20px;
      }
      h1 {
        font-size: 2em;
        margin-bottom: 20px;
        animation: blink 1.5s infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      form {
        background: rgba(255, 255, 255, 0.1);
        padding: 20px;
        border-radius: 10px;
        width: 100%;
        max-width: 400px;
      }
      label {
        display: block;
        margin: 10px 0 5px;
      }
      input {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 5px;
        margin-bottom: 15px;
      }
      button {
        width: 100%;
        padding: 12px;
        background: #ff0066;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: background 0.3s;
      }
      button:hover {
        background: #ff3399;
      }
    </style>
  </head>
  <body>
    <h1>🔥 Gerador de Bot WhatsApp 🔥</h1>
    <form action="/download" method="POST">
      <label>Nome do Bot:</label>
      <input type="text" name="nome" required />
      <label>Prefixo:</label>
      <input type="text" name="prefixo" required />
      <label>Número do Dono (com DDI):</label>
      <input type="text" name="dono" required />
      <button type="submit">Download</button>
    </form>
  </body>
  </html>
  `);
});

// Rota para gerar e baixar o ZIP
app.post('/download', (req, res) => {
  const { nome, prefixo, dono } = req.body;

  // Conteúdo do bot com switch-case
  const botCode = `
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const P = require("pino");
const settings = require("./settings.json");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const imp = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  });

  imp.ev.on("creds.update", saveCreds);

  imp.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const tipo = Object.keys(msg.message)[0];
    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    if (!texto.startsWith(settings.prefixo)) return;
    const args = texto.slice(settings.prefixo.length).trim().split(/ +/);
    const comando = args.shift()?.toLowerCase();

    switch (comando) {
      case "oi":
        await imp.sendMessage(msg.key.remoteJid, { text: "Oi meu patrão!" });
        break;
      case "dono":
        await imp.sendMessage(msg.key.remoteJid, { text: "Meu dono é: ${settings.dono}" });
        break;
      default:
        await imp.sendMessage(msg.key.remoteJid, { text: "Comando não encontrado!" });
    }
  });
}

startBot();
`;

  const packageJSON = {
    name: nome.toLowerCase().replace(/\s+/g, "-"),
    version: "1.0.0",
    main: "bot.js",
    scripts: {
      start: "node bot.js"
    },
    dependencies: {
      "@whiskeysockets/baileys": "^6.7.0",
      "pino": "^8.0.0"
    }
  };

  const settingsJSON = {
    nome,
    prefixo,
    dono
  };

  // Cria arquivos temporários
  fs.mkdirSync("temp", { recursive: true });
  fs.writeFileSync("temp/bot.js", botCode);
  fs.writeFileSync("temp/package.json", JSON.stringify(packageJSON, null, 2));
  fs.writeFileSync("temp/settings.json", JSON.stringify(settingsJSON, null, 2));

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=meu-bot.zip");

  const archive = archiver("zip");
  archive.pipe(res);
  archive.directory("temp/", false);
  archive.finalize();

  archive.on("end", () => fs.rmSync("temp", { recursive: true, force: true }));
});

app.listen(port, () => {
  console.log(\`🌐 Servidor rodando em http://localhost:\${port}\`);
});
