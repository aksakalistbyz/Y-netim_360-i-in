const express = require('express');
const router = express.Router();

const {
  addPlate,
  getPlates,
  getPlateById,
  updatePlate,
  deletePlate
} = require('../controllers/plateController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

router.use(checkAuthentication);

// Listelemek için
router.get('/', getPlates);

// Detay için
router.get('/:id', getPlateById);

router.post('/', requireAdmin, addPlate);

router.put('/:id', requireAdmin, updatePlate);

router.delete('/:id', requireAdmin, deletePlate);

module.exports = router;