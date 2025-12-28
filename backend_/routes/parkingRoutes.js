const express = require('express');
const router = express.Router();

const {
  addSlot,
  getSlots,
  getSlotById,
  assignVehicle,
  removeVehicle,
  getOccupiedSlots,
  getAvailableSlots,
  deleteSlot,
  toggleSlot  // ← BUNU EKLE
} = require('../controllers/parkingController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

router.use(checkAuthentication);

// Listeleme
router.get('/', getSlots);
router.get('/occupied', getOccupiedSlots);
router.get('/available', getAvailableSlots);

router.post('/', requireAdmin, addSlot);

// Araç park etmek için (admin)
router.put('/:id/assign', requireAdmin, assignVehicle);

// Araç çıkart (admin)
router.put('/:id/remove', requireAdmin, removeVehicle);

// Tek slot detayı
router.get('/:id', getSlotById);

// Basit toggle
router.put('/:id/toggle', checkAuthentication, toggleSlot);

router.delete('/:id', requireAdmin, deleteSlot);

module.exports = router;