const express = require('express');
const router = express.Router();

// Controller fonksiyonlarını import edelim
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  verifyUserToken
} = require('../controllers/authController');

// Middleware'leri import et
const { checkAuthentication } = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin } = require('../middleware/validator');

// Public endpoints (Giriş yapmadan erişilebilir)
router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, loginUser);

// Protected endpoints (Token gerekli)
router.post('/logout', checkAuthentication, logoutUser);
router.get('/profile', checkAuthentication, getUserProfile);
router.get('/verify', checkAuthentication, verifyUserToken);

module.exports = router;
