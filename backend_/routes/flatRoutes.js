const express = require('express');
const router = express.Router();

const {
  addFlat,
  getFlats,
  getFlatById,
  updateFlat,
  deleteFlat,
  generateFlats   // ⭐ YENİ EKLEDİK
} = require('../controllers/flatController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

// ⬇️ BUNU EN ÜSTE EKLE (checkAuthentication'dan ÖNCE)
router.get('/public/:apartmentCode', async (req, res) => {
  try {
    const { apartmentCode } = req.params;
    const { getDatabasePool } = require('../config/db');
    const { sendSuccess, sendError } = require('../utils/responseHandler');
    
    const db = getDatabasePool();
    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query('SELECT flatId, flatNumber, block, floor FROM Flats WHERE apartmentCode = @aptCode ORDER BY CAST(flatNumber AS INT)');
    
    return sendSuccess(res, 200, 'Daireler listelendi', {
      flats: result.recordset
    });
  } catch (err) {
    console.error('Daire listeleme hatası:', err);
    return res.status(500).json({ success: false, message: 'Daireler listelenemedi' });
  }
});

// Diğer route'lar buradan devam eder...
router.use(checkAuthentication);

// Tüm flat işlemleri için authentication zorunlu
router.use(checkAuthentication);

// ⭐ YENİ: Toplu daire oluşturma (sadece admin)
router.post('/generate', requireAdmin, generateFlats);

// Listele
router.get('/', getFlats);

// Detay
router.get('/:id', getFlatById);

// Tek daire ekleme
router.post('/', requireAdmin, addFlat);

// Güncelleme
router.put('/:id', requireAdmin, updateFlat);

// Silme
router.delete('/:id', requireAdmin, deleteFlat);

module.exports = router;