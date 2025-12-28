const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Yeni daire ekleme
async function addFlat(req, res) {
  try {
    const { flatNumber, floor, block, residentCount } = req.body;
    const apartmentCode = req.user.apartmentCode;
    
    // Zorunlu alan kontrolü için
    if (!flatNumber) {
      return sendError(res, 400, 'Daire numarası zorunludur');
    }
    
    const db = getDatabasePool();
    
    // Aynı daire var mı kontrol edelim
    const checkResult = await db.request()
      .input('aptCode', apartmentCode)
      .input('flatNum', flatNumber)
      .query('SELECT flatId FROM Flats WHERE apartmentCode = @aptCode AND flatNumber = @flatNum');
    
    if (checkResult.recordset.length > 0) {
      return sendError(res, 409, 'Bu daire numarası zaten kayıtlı');
    }
    
    // Daire ekleyelim
    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('flatNum', flatNumber)
      .input('flr', floor || null)
      .input('blk', block || null)
      .input('resCount', residentCount || 0)
      .query(`
        INSERT INTO Flats (apartmentCode, flatNumber, floor, block, residentCount, createdAt)
        OUTPUT INSERTED.*
        VALUES (@aptCode, @flatNum, @flr, @blk, @resCount, GETDATE())
      `);
    
    return sendSuccess(res, 201, 'Daire başarıyla eklendi', {
      flat: result.recordset[0]
    });
    
  } catch (err) {
    console.error('Daire ekleme hatası:', err);
    return sendError(res, 500, 'Daire eklenirken bir hata oluştu');
  }
}

// Daireleri listeleyelim
async function getFlats(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();
    
    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT * FROM Flats 
        WHERE apartmentCode = @aptCode 
        ORDER BY 
          CASE WHEN block IS NOT NULL THEN block ELSE '' END,
          CASE WHEN floor IS NOT NULL THEN floor ELSE 0 END,
          flatNumber
      `);
    
    return sendSuccess(res, 200, 'Daireler listelendi', {
      flats: result.recordset,
      total: result.recordset.length
    });
    
  } catch (err) {
    console.error('Daire listeleme hatası:', err);
    return sendError(res, 500, 'Daireler listelenirken hata oluştu');
  }
}

// Tek bir daire getirmek için
async function getFlatById(req, res) {
  try {
    const flatId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();
    
    if (isNaN(flatId)) {
      return sendError(res, 400, 'Geçersiz daire ID');
    }
    
    const result = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query('SELECT * FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');
    
    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }
    
    return sendSuccess(res, 200, 'Daire bulundu', {
      flat: result.recordset[0]
    });
    
  } catch (err) {
    console.error('Daire getirme hatası:', err);
    return sendError(res, 500, 'Daire getirilirken hata oluştu');
  }
}

// Daire güncelleyelim
async function updateFlat(req, res) {
  try {
    const flatId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { flatNumber, floor, block, residentCount } = req.body;
    const db = getDatabasePool();
    
    if (isNaN(flatId)) {
      return sendError(res, 400, 'Geçersiz daire ID');
    }
    
    // Daire var mı ve bu apartmana ait mi kontrol edelim
    const checkFlat = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query('SELECT flatId FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');
    
    if (checkFlat.recordset.length === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }
    
    // Eğer daire numarası değiştiriliyorsa, aynı numara var mı kontrol edelim
    if (flatNumber) {
      const duplicateCheck = await db.request()
        .input('fId', flatId)
        .input('aptCode', apartmentCode)
        .input('flatNum', flatNumber)
        .query('SELECT flatId FROM Flats WHERE apartmentCode = @aptCode AND flatNumber = @flatNum AND flatId != @fId');
      
      if (duplicateCheck.recordset.length > 0) {
        return sendError(res, 409, 'Bu daire numarası başka bir dairede kayıtlı');
      }
    }
    
    // Güncelleme sorgusu oluşturalım
    const result = await db.request()
      .input('fId', flatId)
      .input('flatNum', flatNumber)
      .input('flr', floor !== undefined ? floor : null)
      .input('blk', block !== undefined ? block : null)
      .input('resCount', residentCount !== undefined ? residentCount : 0)
      .query(`
        UPDATE Flats 
        SET 
          flatNumber = ISNULL(@flatNum, flatNumber),
          floor = @flr,
          block = @blk,
          residentCount = @resCount
        OUTPUT INSERTED.*
        WHERE flatId = @fId
      `);
    
    return sendSuccess(res, 200, 'Daire güncellendi', {
      flat: result.recordset[0]
    });
    
  } catch (err) {
    console.error('Daire güncelleme hatası:', err);
    return sendError(res, 500, 'Daire güncellenirken hata oluştu');
  }
}

// Daire silmek için
async function deleteFlat(req, res) {
  try {
    const flatId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();
    
    if (isNaN(flatId)) {
      return sendError(res, 400, 'Geçersiz daire ID');
    }
    
    // Daireye bağlı sakin var mı kontrol edelim
    const residentCheck = await db.request()
      .input('fId', flatId)
      .query('SELECT userId FROM Users WHERE flatId = @fId');
    
    if (residentCheck.recordset.length > 0) {
      return sendError(res, 400, 'Bu dairede kayıtlı sakinler var. Önce sakinleri silin veya başka daireye taşıyın');
    }
    
    const result = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query('DELETE FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');
    
    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }
    
    return sendSuccess(res, 200, 'Daire silindi');
    
  } catch (err) {
    console.error('Daire silme hatası:', err);
    return sendError(res, 500, 'Daire silinirken hata oluştu');
  }
}
// Toplu daire oluşturma (Yönetici ilk girişte)
async function generateFlats(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { count } = req.body;

    if (!count || count < 1) {
      return sendError(res, 400, 'Geçerli bir daire sayısı girin');
    }

    const db = getDatabasePool();

    // 1'den count'a kadar daire oluştur
    for (let i = 1; i <= count; i++) {
      await db.request()
        .input('aptCode', apartmentCode)
        .input('flatNum', i.toString())
        .input('flr', Math.ceil(i / 4)) // 4 daire = 1 kat mantığı
        .input('blk', 'A')
        .input('resCount', 0)
        .query(`
          INSERT INTO Flats (apartmentCode, flatNumber, floor, block, residentCount, createdAt)
          VALUES (@aptCode, @flatNum, @flr, @blk, @resCount, GETDATE())
        `);
    }

    return sendSuccess(res, 201, `${count} daire başarıyla oluşturuldu`);

  } catch (err) {
    console.error('Toplu daire oluşturma hatası:', err);
    return sendError(res, 500, 'Daireler oluşturulurken bir hata oluştu');
  }
}
module.exports = {
  addFlat,
  getFlats,
  getFlatById,
  updateFlat,
  deleteFlat,
  generateFlats   // ← BUNU EKLE

};