const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const bibliotecarioRoutes = require('./routes/bibliotecarioRoutes');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors()); // Libera acesso para o Front-end React
app.use(express.json()); // Permite ler JSON no body das requisições

// Rotas
app.use('/users', userRoutes);
app.use('/bibliotecarios', bibliotecarioRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('API de Usuários - Biblioteca+ está rodando!');
});

app.listen(PORT, () => {
    console.log(`Servidor de Usuários rodando na porta ${PORT}`);
});