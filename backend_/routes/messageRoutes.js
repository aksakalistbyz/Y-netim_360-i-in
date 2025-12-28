const express = require('express');
const router = express.Router();

const {
  sendMessage,
  getInbox,
  getSentMessages,
  getMessageById,
  getConversation,
  markAsRead,
  deleteMessage,
  getUsers
} = require('../controllers/messageController');

const { checkAuthentication } = require('../middleware/authMiddleware');

router.use(checkAuthentication);

router.post('/', sendMessage);

router.get('/inbox', getInbox);

router.get('/sent', getSentMessages);

router.get('/users/list', getUsers);

// Konuşma geçmişi
router.get('/conversation/:userId', getConversation);

// Mesajı okundu işaretle
router.put('/:id/read', markAsRead);

router.get('/:id', getMessageById);

router.delete('/:id', deleteMessage);

module.exports = router;