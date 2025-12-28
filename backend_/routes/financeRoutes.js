const express = require('express');
const router = express.Router();

const {
  addRecord,
  getRecords,
  getRecordById,
  getSummary,
  getDetailedReport,
  getMonthlyReport,
  updateRecord,
  deleteRecord
} = require('../controllers/financeController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

router.use(checkAuthentication);

// Raporlar için
router.get('/summary', getSummary);
router.get('/report/detailed', getDetailedReport);
router.get('/report/monthly', getMonthlyReport);

// Listeleme
router.get('/', getRecords);

// Tek kayıt
router.get('/:id', getRecordById);

router.post('/', requireAdmin, addRecord);

router.put('/:id', requireAdmin, updateRecord);

router.delete('/:id', requireAdmin, deleteRecord);

module.exports = router;