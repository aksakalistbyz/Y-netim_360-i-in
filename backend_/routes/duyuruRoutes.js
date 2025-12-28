const express = require('express');
const router = express.Router();

const {
  addAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/duyuruController');

const { checkAuthentication, requireAdmin } = require('../middleware/authMiddleware');

router.use(checkAuthentication);

// Tüm duyurular için
router.get('/', getAnnouncements);

// Tek duyuru için
router.get('/:id', getAnnouncementById);

router.post('/', requireAdmin, addAnnouncement);

router.put('/:id', requireAdmin, updateAnnouncement);

router.delete('/:id', requireAdmin, deleteAnnouncement);

module.exports = router;