const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Mesaj göndermek için
async function sendMessage(req, res) {
  try {
    const { receiverId, subject, content } = req.body;
    const apartmentCode = req.user.apartmentCode;
    const senderId = req.user.userId;

    if (!content) {
      return sendError(res, 400, 'Mesaj içeriği boş olamaz');
    }

    const db = getDatabasePool();

    // Alıcı varsa aynı apartmanda mı kontrol edelim
    if (receiverId) {
      const receiverCheck = await db.request()
        .input('rId', receiverId)
        .input('aptCode', apartmentCode)
        .query('SELECT userId FROM Users WHERE userId = @rId AND apartmentCode = @aptCode');

      if (receiverCheck.recordset.length === 0) {
        return sendError(res, 404, 'Alıcı bulunamadı');
      }

      if (senderId === receiverId) {
        return sendError(res, 400, 'Kendinize mesaj gönderemezsiniz');
      }
    }

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('senderId', senderId)
      .input('receiverId', receiverId || null)
      .input('subject', subject || null)
      .input('content', content)
      .query(`
        INSERT INTO Messages (apartmentCode, senderId, receiverId, subject, content, isRead, createdAt)
        OUTPUT INSERTED.*
        VALUES (@aptCode, @senderId, @receiverId, @subject, @content, 0, GETDATE())
      `);

    return sendSuccess(res, 201, 'Mesaj gönderildi', { 
      message: result.recordset[0] 
    });

  } catch (err) {
    console.error('Mesaj gönderme hatası:', err);
    return sendError(res, 500, 'Mesaj gönderilemedi');
  }
}

// Gelen kutusu -ŞİKAYETLER İÇİN GÜNCELLEME
async function getInbox(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { isRead } = req.query;
    const db = getDatabasePool();

    let query = `
      SELECT m.*, 
             CONCAT(u.firstName, ' ', u.lastName) as senderName,
             u.role as senderRole
      FROM Messages m
      LEFT JOIN Users u ON m.senderId = u.userId
      WHERE m.apartmentCode = @aptCode
    `;

    const request = db.request()
      .input('aptCode', apartmentCode)
      .input('userId', userId);

    if (userRole === 'admin') {
      query += ' AND (m.receiverId = @userId OR m.receiverId IS NULL)';
    } else {
      query += ' AND (m.receiverId = @userId OR m.senderId = @userId)';
    }

    if (isRead !== undefined) {
      query += ' AND m.isRead = @isRead';
      request.input('isRead', isRead === 'true' ? 1 : 0);
    }

    query += ' ORDER BY m.createdAt DESC';

    const result = await request.query(query);

    // Okunmamış sayısı
    let unreadQuery = 'SELECT COUNT(*) as count FROM Messages WHERE isRead = 0 AND apartmentCode = @aptCode';
    if (userRole === 'admin') {
      unreadQuery += ' AND (receiverId = @userId OR receiverId IS NULL)';
    } else {
      unreadQuery += ' AND receiverId = @userId';
    }

    const unreadCount = await db.request()
      .input('userId', userId)
      .input('aptCode', apartmentCode)
      .query(unreadQuery);

    return sendSuccess(res, 200, 'Gelen kutusu', { 
      inbox: result.recordset,
      total: result.recordset.length,
      unreadCount: unreadCount.recordset[0].count
    });

  } catch (err) {
    console.error('Gelen kutusu hatası:', err);
    return sendError(res, 500, 'Gelen kutusu alınamadı');
  }
}

// Gönderilen mesajlar
async function getSentMessages(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('userId', userId)
      .query(`
        SELECT m.*, 
               CONCAT(u.firstName, ' ', u.lastName) as receiverName,
               u.role as receiverRole
        FROM Messages m
        LEFT JOIN Users u ON m.receiverId = u.userId
        WHERE m.apartmentCode = @aptCode AND m.senderId = @userId
        ORDER BY m.createdAt DESC
      `);

    return sendSuccess(res, 200, 'Gönderilen mesajlar', { 
      sent: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Gönderilen mesajlar hatası:', err);
    return sendError(res, 500, 'Gönderilen mesajlar alınamadı');
  }
}

// Tek mesaj detayı
async function getMessageById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz mesaj ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT m.*, 
               CONCAT(s.firstName, ' ', s.lastName) as senderName,
               s.role as senderRole,
               CONCAT(r.firstName, ' ', r.lastName) as receiverName,
               r.role as receiverRole
        FROM Messages m
        LEFT JOIN Users s ON m.senderId = s.userId
        LEFT JOIN Users r ON m.receiverId = r.userId
        WHERE m.messageId = @id AND m.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Mesaj bulunamadı');
    }

    const message = result.recordset[0];

    // Kullanıcı bu mesajın tarafı mı
    if (message.senderId !== userId && message.receiverId !== userId && message.receiverId !== null) {
      return sendError(res, 403, 'Bu mesajı görme yetkiniz yok');
    }

    // Alıcı okuyorsa otomatik okundu işaretle
    if (message.receiverId === userId && message.isRead === 0) {
      await db.request()
        .input('id', id)
        .query('UPDATE Messages SET isRead = 1 WHERE messageId = @id');

      message.isRead = 1;
    }

    return sendSuccess(res, 200, 'Mesaj detayı', { 
      message: message 
    });

  } catch (err) {
    console.error('Mesaj detayı hatası:', err);
    return sendError(res, 500, 'Mesaj getirilemedi');
  }
}

// Konuşma geçmişi
async function getConversation(req, res) {
  try {
    const otherUserId = parseInt(req.params.userId);
    const userId = req.user.userId;
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(otherUserId)) {
      return sendError(res, 400, 'Geçersiz kullanıcı ID');
    }

    const result = await db.request()
      .input('userId', userId)
      .input('otherUserId', otherUserId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT m.*, 
               CONCAT(s.firstName, ' ', s.lastName) as senderName,
               CONCAT(r.firstName, ' ', r.lastName) as receiverName
        FROM Messages m
        LEFT JOIN Users s ON m.senderId = s.userId
        LEFT JOIN Users r ON m.receiverId = r.userId
        WHERE m.apartmentCode = @aptCode
          AND ((m.senderId = @userId AND m.receiverId = @otherUserId)
            OR (m.senderId = @otherUserId AND m.receiverId = @userId))
        ORDER BY m.createdAt ASC
      `);

    return sendSuccess(res, 200, 'Konuşma geçmişi', {
      messages: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Konuşma hatası:', err);
    return sendError(res, 500, 'Konuşma geçmişi alınamadı');
  }
}

// Mesajı okundu işaretle
async function markAsRead(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz mesaj ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .input('userId', userId)
      .query(`
        UPDATE Messages
        SET isRead = 1
        OUTPUT INSERTED.*
        WHERE messageId = @id AND apartmentCode = @aptCode AND receiverId = @userId
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Mesaj bulunamadı');
    }

    return sendSuccess(res, 200, 'Mesaj okundu işaretlendi', { 
      message: result.recordset[0] 
    });

  } catch (err) {
    console.error('Okundu işaretleme hatası:', err);
    return sendError(res, 500, 'Mesaj işaretlenemedi');
  }
}

// Mesaj sil
async function deleteMessage(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz mesaj ID');
    }

    // Yöneticiler tüm mesajları silebilirsin, sakinler sadece kendilerine ait olanları silebilsinler
    let query;
    if (userRole === 'admin') {
      query = `
        DELETE FROM Messages
        WHERE messageId = @id AND apartmentCode = @aptCode
      `;
    } else {
      query = `
        DELETE FROM Messages
        WHERE messageId = @id AND apartmentCode = @aptCode 
          AND (senderId = @userId OR receiverId = @userId)
      `;
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .input('userId', userId)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Mesaj bulunamadı veya silme yetkiniz yok');
    }

    return sendSuccess(res, 200, 'Mesaj silindi');

  } catch (err) {
    console.error('Mesaj silme hatası:', err);
    return sendError(res, 500, 'Mesaj silinemedi');
  }
}

// Kullanıcı listesi (mesaj göndermek için)
async function getUsers(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const userId = req.user.userId;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('userId', userId)
      .query(`
        SELECT userId, 
               CONCAT(firstName, ' ', lastName) as fullName,
               email, 
               role
        FROM Users
        WHERE apartmentCode = @aptCode AND userId != @userId
        ORDER BY role DESC, firstName
      `);

    return sendSuccess(res, 200, 'Kullanıcılar listelendi', {
      users: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err);
    return sendError(res, 500, 'Kullanıcılar listelenemedi');
  }
}

module.exports = {
  sendMessage,
  getInbox,
  getSentMessages,
  getMessageById,
  getConversation,
  markAsRead,
  deleteMessage,
  getUsers
};