const express = require('express');
const router = express.Router();
const bibliotecarioController = require('../controllers/bibliotecarioController');

// Rotas CRUD
router.get('/', bibliotecarioController.getAllBibliotecarios);
router.get('/:id', bibliotecarioController.getBibliotecarioById);
router.post('/register', bibliotecarioController.criarBibliotecario);
router.put('/:id', bibliotecarioController.updateBibliotecario);
router.delete('/:id', bibliotecarioController.deleteBibliotecario);

// Rota de Login específica
router.post('/login', bibliotecarioController.login);

module.exports = router;