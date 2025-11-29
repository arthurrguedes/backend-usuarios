const { poolSamuel, poolArthur, poolThamires } = require('../db');
const jwt = require('jsonwebtoken');

const userController = {
    
    // --- LISTAR TODOS (Banco Principal - Samuel) ---
    getAllUsers: async (req, res) => {
        try {
            const [rows] = await poolSamuel.query('SELECT usuario_id, usuario_nome, usuario_email, usuario_dataDeNascimento, usuario_telefone, usuario_endereco FROM usuario');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- BUSCAR POR ID (Banco Principal - Samuel) ---
    getUserById: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await poolSamuel.query('SELECT usuario_id, usuario_nome, usuario_email, usuario_dataDeNascimento, usuario_telefone, usuario_endereco FROM usuario WHERE usuario_id = ?', [id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }
            
            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- CRIAR USUÁRIO (COM REPLICAÇÃO CORRIGIDA) ---
    createUser: async (req, res) => {
        const { nome, email, senha, dataNascimento, telefone, endereco } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ message: "Preencha todos os campos obrigatórios" });
        }

        let connSamuel, connArthur, connThamires;

        try {
            connSamuel = await poolSamuel.getConnection();
            connArthur = await poolArthur.getConnection();
            connThamires = await poolThamires.getConnection();

            // Verifica se já existe no banco principal
            const [existing] = await connSamuel.query('SELECT * FROM usuario WHERE usuario_email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ message: "Email já cadastrado" });
            }

            await connSamuel.beginTransaction();

            // 1. Inserir no Banco Principal (Samuel)
            // Schema: usuario_nome, usuario_email, ...
            const querySamuel = `
                INSERT INTO usuario (usuario_nome, usuario_email, usuario_senha, usuario_dataDeNascimento, usuario_telefone, usuario_endereco) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [resultSamuel] = await connSamuel.query(querySamuel, [nome, email, senha, dataNascimento, telefone, endereco]);
            const novoId = resultSamuel.insertId;

            // 2. Inserir no Banco Referência (Arthur) - CORRIGIDO
            // Tabela: usuarioreferencia
            // Colunas: id, nome, tipoUsuario
            const queryArthur = `
                INSERT INTO usuarioreferencia (id, nome, tipoUsuario) 
                VALUES (?, ?, 'user')
            `;
            await connArthur.query(queryArthur, [novoId, nome]);

            // 3. Inserir no Banco Réplica (Thamires)
            // Tabela: usuario
            // Colunas: idUsuario, nomeUsuario, email, senha
            const queryThamires = `
                INSERT INTO usuario (idUsuario, nomeUsuario, email, senha) 
                VALUES (?, ?, ?, ?)
            `;
            await connThamires.query(queryThamires, [novoId, nome, email, senha]);

            // Confirma transação no principal se todas as réplicas funcionarem (ou se não quiser bloquear, pode mover o commit para cima)
            await connSamuel.commit();

            res.status(201).json({ 
                message: "Usuário criado e replicado com sucesso",
                id: novoId 
            });

        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            
            // Desfaz no principal se houver erro
            if (connSamuel) await connSamuel.rollback();
            
            // Retorna erro mas não expõe detalhes técnicos sensíveis
            res.status(500).json({ error: "Erro ao registrar usuário. Verifique os logs." });
        } finally {
            if (connSamuel) connSamuel.release();
            if (connArthur) connArthur.release();
            if (connThamires) connThamires.release();
        }
    },

    // --- ATUALIZAR USUÁRIO (Mantido no principal) ---
    updateUser: async (req, res) => {
        const { id } = req.params;
        const { nome, email, senha, dataNascimento, telefone, endereco } = req.body;

        try {
            const [current] = await poolSamuel.query('SELECT * FROM usuario WHERE usuario_id = ?', [id]);
            
            if (current.length === 0) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            const user = current[0];

            const novoNome = nome || user.usuario_nome;
            const novoEmail = email || user.usuario_email;
            const novaSenha = senha || user.usuario_senha;
            const novaData = dataNascimento || user.usuario_dataDeNascimento;
            const novoTelefone = telefone || user.usuario_telefone;
            const novoEndereco = endereco || user.usuario_endereco;

            const query = `
                UPDATE usuario 
                SET usuario_nome = ?, usuario_email = ?, usuario_senha = ?, usuario_dataDeNascimento = ?, usuario_telefone = ?, usuario_endereco = ?
                WHERE usuario_id = ?
            `;

            await poolSamuel.query(query, [novoNome, novoEmail, novaSenha, novaData, novoTelefone, novoEndereco, id]);

            res.json({ 
                message: "Usuário atualizado com sucesso",
                user: {
                    id: id,
                    nome: novoNome,
                    email: novoEmail,
                    telefone: novoTelefone,
                    endereco: novoEndereco
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- DELETAR USUÁRIO (Mantido no principal) ---
    deleteUser: async (req, res) => {
        const { id } = req.params;

        try {
            const [result] = await poolSamuel.query('DELETE FROM usuario WHERE usuario_id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            res.json({ message: "Usuário deletado com sucesso" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // --- LOGIN (Mantido no principal) ---
    login: async (req, res) => {
        const { email, senha } = req.body;

        try {
            const [rows] = await poolSamuel.query('SELECT * FROM usuario WHERE usuario_email = ?', [email]);

            if (rows.length === 0) {
                return res.status(404).json({ message: "Usuário não encontrado" });
            }

            const user = rows[0];

            if (user.usuario_senha !== senha) {
                return res.status(401).json({ message: "Senha incorreta" });
            }

            const token = jwt.sign(
                { 
                    id: user.usuario_id, 
                    email: user.usuario_email,
                    role: 'usuario'
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } 
            );

            res.json({
                message: "Login realizado com sucesso",
                token: token,
                user: {
                    id: user.usuario_id,
                    nome: user.usuario_nome,
                    email: user.usuario_email,
                    telefone: user.usuario_telefone,
                    endereco: user.usuario_endereco,
                    foto: user.usuario_foto ? `http://localhost:3006/uploads/${user.usuario_foto}` : null,
                    role: 'usuario'
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = userController;