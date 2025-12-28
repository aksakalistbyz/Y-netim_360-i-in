const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Yeni duyuru ekleme (sadece admin)
async function addAnnouncement(req, res) {
  try {
    const { title, content, priority } = req.body;
    const apartmentCode = req.user.apartmentCode;
    const createdBy = req.user.userId;

    if (!title || !content) {
      return sendError(res, 400, 'Başlık ve içerik zorunludur');
    }

    const db = getDatabasePool();
    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('title', title)
      .input('content', content)
      .input('createdBy', createdBy)
      .input('priority', priority || 'normal')
      .query(`
        INSERT INTO Announcements (apartmentCode, title, content, createdBy, priority, createdAt)
        OUTPUT INSERTED.*
        VALUES (@aptCode, @title, @content, @createdBy, @priority, GETDATE())
      `);

    return sendSuccess(res, 201, 'Duyuru eklendi', { 
      announcement: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Duyuru ekleme hatası:', err);
    return sendError(res, 500, 'Duyuru eklenemedi');
  }
}

// Tüm duyuruları listele
async function getAnnouncements(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { priority } = req.query;
    const db = getDatabasePool();

    let query = `
      SELECT a.*, 
             u.fullName as authorName
      FROM Announcements a
      LEFT JOIN Users u ON a.createdBy = u.userId
      WHERE a.apartmentCode = @aptCode
    `;

    const request = db.request().input('aptCode', apartmentCode);

    if (priority) {
      query += ' AND a.priority = @priority';
      request.input('priority', priority);
    }

    query += ' ORDER BY a.createdAt DESC';

    const result = await request.query(query);

    return sendSuccess(res, 200, 'Duyurular listelendi', { 
      announcements: result.recordset,
      total: result.recordset.length
    });
    
  } catch (err) {
    console.error('Listeleme hatası:', err);
    return sendError(res, 500, 'Duyurular listelenemedi');
  }
}

// Tek duyuru getirmek için
async function getAnnouncementById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz duyuru ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT a.*, 
               u.fullName as authorName,
               u.email as authorEmail
        FROM Announcements a
        LEFT JOIN Users u ON a.createdBy = u.userId
        WHERE a.announcementId = @id AND a.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Duyuru bulunamadı');
    }

    return sendSuccess(res, 200, 'Duyuru bulundu', { 
      announcement: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Getirme hatası:', err);
    return sendError(res, 500, 'Duyuru getirilemedi');
  }
}

// Duyuru güncelleme (sadece admin)
async function updateAnnouncement(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { title, content, priority } = req.body;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz duyuru ID');
    }

    // Duyuru var mı kontrol edelim
    const checkResult = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query('SELECT announcementId FROM Announcements WHERE announcementId = @id AND apartmentCode = @aptCode');

    if (checkResult.recordset.length === 0) {
      return sendError(res, 404, 'Duyuru bulunamadı');
    }

    const result = await db.request()
      .input('id', id)
      .input('title', title)
      .input('content', content)
      .input('priority', priority)
      .query(`
        UPDATE Announcements
        SET 
          title = ISNULL(@title, title),
          content = ISNULL(@content, content),
          priority = ISNULL(@priority, priority)
        OUTPUT INSERTED.*
        WHERE announcementId = @id
      `);

    return sendSuccess(res, 200, 'Duyuru güncellendi', { 
      announcement: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Güncelleme hatası:', err);
    return sendError(res, 500, 'Duyuru güncellenemedi');
  }
}

// Duyuru silme (sadece admin)
async function deleteAnnouncement(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz duyuru ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query('DELETE FROM Announcements WHERE announcementId = @id AND apartmentCode = @aptCode');

    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Duyuru bulunamadı');
    }

    return sendSuccess(res, 200, 'Duyuru silindi');
    
  } catch (err) {
    console.error('Silme hatası:', err);
    return sendError(res, 500, 'Duyuru silinemedi');
  }
}

module.exports = { 
  addAnnouncement, 
  getAnnouncements, 
  getAnnouncementById, 
  updateAnnouncement,
  deleteAnnouncement 
};