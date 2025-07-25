const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));

// Página principal com formulário
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Gerador de Bot Mary</title>
        <style>
          body {
            font-family: Arial;
            background: #121212;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          input, button {
            padding: 10px;
            margin: 5px;
            font-size: 16px;
          }
          button {
            background: #00ff88;
            border: none;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <h2>Gerador de Bot Mary</h2>
        <form method="POST" action="/download">
          <input type="text" name="botname" placeholder="Nome do Bot" required><br>
          <input type="text" name="prefix" placeholder="Prefixo" required><br>
          <input type="text" name="owner" placeholder="Número do Dono" required><br>
          <button type="submit">Download</button>
        </form>
      </body>
    </html>
  `);
});

// Lógica para gerar o ZIP
app.post('/download', (req, res) => {
  const { botname, prefix, owner } = req.body;
  const tmpDir = './temp-bot';
  const settingsJson = {
    nome: botname,
    prefixo: prefix,
    dono: owner,
    numero_bot: '5551999999999' // pode ajustar
  };

  // Limpa e recria pasta temp
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir);

  // Cria o settings.json
  fs.writeFileSync(`${tmpDir}/settings.json`, JSON.stringify(settingsJson, null, 2));

  // Cria um arquivo principal de exemplo
  fs.writeFileSync(`${tmpDir}/mary.js`, `
// Arquivo principal do bot: ${botname}
const imperadores = require('@whiskeysockets/baileys').default;
const fs = require('fs');
const settings = require('./settings.json');

console.log(\`Bot: \${settings.nome} iniciado com prefixo "\${settings.prefixo}"\`);
console.log(\`Dono: \${settings.dono}\`);

// Continuação do código real do bot aqui...
`);

  // Cria package.json
  fs.writeFileSync(`${tmpDir}/package.json`, JSON.stringify({
    name: botname.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    main: 'mary.js',
    scripts: {
      start: 'node mary.js'
    },
    dependencies: {
      "@whiskeysockets/baileys": "^6.7.0"
    }
  }, null, 2));

  // Gera o ZIP
  const zipName = 'meu-bot.zip';
  const zipPath = path.join(__dirname, zipName);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    res.download(zipPath, zipName, () => {
      fs.unlinkSync(zipPath);
      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  archive.pipe(output);
  archive.directory(tmpDir, false);
  archive.finalize();
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
