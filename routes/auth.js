const express = require('express');
const router = express.Router();
const {
  register,
  login,
  emailVerify,
  sendVerification,
} = require('../controllers/auth');
router.route('/register/sendVerification').get(sendVerification);
router.route('/register').post(register).get(emailVerify);
router.post('/login', login);

module.exports = router;
