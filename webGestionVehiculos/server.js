require('dotenv').config();

const express = require('express');
const path = require('node:path');

const app = express();
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'client', 'dist');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static(distPath));

// Fallback SPA: todas las rutas que no sean archivos estáticos van a index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
