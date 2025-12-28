const express = require('express');
const router = express.Router();

const {
  addFee,
  getFees,
  getFeeById,
  updatePaymentStatus,
  calculateDebt,
  getDebtorFlats,
  getDebtSummary,
  deleteFee,
  createDuesPeriod
} = require('../controllers/aidatController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

// Tüm route'lar için authentication kontrolü
router.use(checkAuthentication);

// Toplu aidat oluşturmak için
router.post('/period', requireAdmin, createDuesPeriod);

router.post('/', requireAdmin, addFee);

// Listelemek için
router.get('/', getFees);

// Borçlu daireler için
router.get('/debtors', getDebtorFlats);

// Borç özeti
router.get('/summary', getDebtSummary);

// Daire borcu hesaplamak iin
router.get('/debt/:flatId', calculateDebt);

// Tek aidat detayı için
router.get('/:id', getFeeById);

// Ödeme durumu güncelleme
router.put('/:id/status', checkAuthentication, updatePaymentStatus); 

router.delete('/:id', requireAdmin, deleteFee);

module.exports = router;