const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const checkToken = require('../middlewares/auth');

// Rotas Públicas
router.post('/register', userController.createUser);
router.post('/login', userController.login);
router.get('/', userController.getAllUsers);

// Rotas Privadas (Precisa de Token)
router.get('/:id', checkToken, userController.getUserById);
router.put('/:id', checkToken, userController.updateUser); 
router.delete('/:id', checkToken, userController.deleteUser);

module.exports = router;