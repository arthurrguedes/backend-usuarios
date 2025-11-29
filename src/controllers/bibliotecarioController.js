const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const bibliotecarioController = {

    // Listar todos os bibliotecários
    getAllBibliotecarios: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT bibliotecario_id, bibliotecario_nome, bibliotecario_login FROM bibliotecario');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Buscar bibliotecário por ID
    getBibliotecarioById: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query('SELECT bibliotecario_id, bibliotecario_nome, bibliotecario_login FROM bibliotecario WHERE bibliotecario_id = ?', [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ message: "Bibliotecário não encontrado" });
            }
            
            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Criar novo bibliotecário
    criarBibliotecario: async (req, res) => {
        const { nome, login, senha } = req.body;

        if (!nome || !login || !senha) {
            return res.status(400).json({ message: "Preencha todos os campos (nome, login, senha)" });
        }

        try {
            // Verifica se login já existe
            const [existing] = await db.query('SELECT * FROM bibliotecario WHERE bibliotecario_login = ?', [login]);
            if (existing.length > 0) {
                return res.status(409).json({ message: "Login já está em uso" });
            }

            const query = `
                INSERT INTO bibliotecario (bibliotecario_nome, bibliotecario_login, bibliotecario_senha) 
                VALUES (?, ?, ?)
            `;
            
            const [result] = await db.query(query, [nome, login, senha]);

            res.status(201).json({ 
                message: "Bibliotecário criado com sucesso",
                id: result.insertId 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Atualizar bibliotecário
    updateBibliotecario: async (req, res) => {
        const { id } = req.params;
        const { nome, login, senha } = req.body;

        if (!nome || !login || !senha) {
            return res.status(400).json({ message: "Dados insuficientes para atualização" });
        }

        try {
            const [check] = await db.query('SELECT bibliotecario_id FROM bibliotecario WHERE bibliotecario_id = ?', [id]);
            if (check.length === 0) {
                return res.status(404).json({ message: "Bibliotecário não encontrado" });
            }

            const query = `
                UPDATE bibliotecario 
                SET bibliotecario_nome = ?, bibliotecario_login = ?, bibliotecario_senha = ?
                WHERE bibliotecario_id = ?
            `;

            await db.query(query, [nome, login, senha, id]);

            res.json({ message: "Bibliotecário atualizado com sucesso" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Deletar bibliotecário
    deleteBibliotecario: async (req, res) => {
        const { id } = req.params;

        try {
            const [result] = await db.query('DELETE FROM bibliotecario WHERE bibliotecario_id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Bibliotecário não encontrado" });
            }

            res.json({ message: "Bibliotecário deletado com sucesso" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Login de Bibliotecário
    login: async (req, res) => {
        // Nota: A tabela usa 'bibliotecario_login', não email.
        const { login, senha } = req.body;

        try {
            const [rows] = await db.query('SELECT * FROM bibliotecario WHERE bibliotecario_login = ?', [login]);

            if (rows.length === 0) {
                return res.status(404).json({ message: "Bibliotecário não encontrado" });
            }

            const lib = rows[0];

            if (lib.bibliotecario_senha !== senha) {
                return res.status(401).json({ message: "Senha incorreta" });
            }

            const token = jwt.sign(
                { 
                    id: lib.bibliotecario_id, 
                    login: lib.bibliotecario_login,
                    role: 'admin'
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: "Login de bibliotecário realizado com sucesso",
                token: token,
                user: {
                    id: lib.bibliotecario_id,
                    nome: lib.bibliotecario_nome,
                    login: lib.bibliotecario_login,
                    role: 'admin' // Importante para o front-end saber que é admin
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = bibliotecarioController;