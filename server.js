const express = require('express');
const bodyParser = require('body-parser');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/gerar', (req, res) => {
  const { nome, prefixo, dono } = req.body;

  const codigo = `
module.exports = {
  name: "${nome}",
  prefix: "${prefixo}",
  owner: "${dono}",
  run: async (client, message) => {
    message.reply("Plugin ${nome} criado com sucesso!");
  }
}
`;

  const zipName = `${nome.replace(/\s+/g, '_')}_plugin.zip`;
  const output = fs.createWriteStream(zipName);
  const archive = archiver('zip');

  output.on('close', () => {
    res.download(zipName, zipName, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(zipName);
    });
  });

  archive.on('error', err => {
    throw err;
  });

  archive.pipe(output);
  archive.append(codigo, { name: `${nome}.js` });
  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
