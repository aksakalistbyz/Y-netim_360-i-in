const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Yeni plaka ekle
async function addPlate(req, res) {
  try {
    const { plateNumber, ownerName, flatId, vehicleModel, color } = req.body;
    const apartmentCode = req.user.apartmentCode;
    
    // Zorunlu alan kontrolü
    if (!plateNumber) {
      return sendError(res, 400, 'Plaka numarası zorunludur');
    }
    
    const db = getDatabasePool();
    
    // Eğer flatId verilmişse, daire kontrolü yapamak için
    if (flatId) {
      const flatCheck = await db.request()
        .input('fId', flatId)
        .input('aptCode', apartmentCode)
        .query('SELECT flatId FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');
      
      if (flatCheck.recordset.length === 0) {
        return sendError(res, 404, 'Belirtilen daire bulunamadı');
      }
    }
    
    // Aynı plaka var mı kontrol etmek için
    const cleanPlate = plateNumber.toUpperCase().trim();
    const plateCheck = await db.request()
      .input('plate', cleanPlate)
      .input('aptCode', apartmentCode)
      .query('SELECT plateId FROM Plates WHERE plateNumber = @plate AND apartmentCode = @aptCode');
    
    if (plateCheck.recordset.length > 0) {
      return sendError(res, 409, 'Bu plaka zaten kayıtlı');
    }
    
    // Plaka ekle
    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('plateNum', cleanPlate)
      .input('owner', ownerName || null)
      .input('fId', flatId || null)
      .input('model', vehicleModel || null)
      .input('clr', color || null)
      .query(`
        INSERT INTO Plates (apartmentCode, plateNumber, ownerName, flatId, vehicleModel, color, createdAt)
        OUTPUT INSERTED.*
        VALUES (@aptCode, @plateNum, @owner, @fId, @model, @clr, GETDATE())
      `);

    return sendSuccess(res, 201, 'Plaka başarıyla eklendi', { 
      plate: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Plaka ekleme hatası:', err);
    return sendError(res, 500, 'Plaka eklenirken hata oluştu');
  }
}

// Plakaları listele
async function getPlates(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT p.*, 
               f.flatNumber, 
               f.block, 
               f.floor
        FROM Plates p
        LEFT JOIN Flats f ON p.flatId = f.flatId
        WHERE p.apartmentCode = @aptCode
        ORDER BY p.plateNumber
      `);

    return sendSuccess(res, 200, 'Plakalar listelendi', {
      plates: result.recordset,
      total: result.recordset.length
    });
    
  } catch (err) {
    console.error('Plaka listeleme hatası:', err);
    return sendError(res, 500, 'Plakalar listelenirken hata oluştu');
  }
}

// Tek plaka getir
async function getPlateById(req, res) {
  try {
    const plateId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(plateId)) {
      return sendError(res, 400, 'Geçersiz plaka ID');
    }

    const result = await db.request()
      .input('pId', plateId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT p.*, 
               f.flatNumber, 
               f.block, 
               f.floor
        FROM Plates p
        LEFT JOIN Flats f ON p.flatId = f.flatId
        WHERE p.plateId = @pId AND p.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Plaka bulunamadı');
    }

    return sendSuccess(res, 200, 'Plaka bulundu', { 
      plate: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Plaka getirme hatası:', err);
    return sendError(res, 500, 'Plaka getirilirken hata oluştu');
  }
}

// Plaka güncelle
async function updatePlate(req, res) {
  try {
    const plateId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { plateNumber, ownerName, flatId, vehicleModel, color } = req.body;
    const db = getDatabasePool();

    if (isNaN(plateId)) {
      return sendError(res, 400, 'Geçersiz plaka ID');
    }

    // Plaka var mı ve bu apartmana ait mi
    const checkPlate = await db.request()
      .input('pId', plateId)
      .input('aptCode', apartmentCode)
      .query('SELECT plateId FROM Plates WHERE plateId = @pId AND apartmentCode = @aptCode');

    if (checkPlate.recordset.length === 0) {
      return sendError(res, 404, 'Plaka bulunamadı');
    }

    // Eğer flatId verilmişse kontrol et
    if (flatId) {
      const flatCheck = await db.request()
        .input('fId', flatId)
        .input('aptCode', apartmentCode)
        .query('SELECT flatId FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');

      if (flatCheck.recordset.length === 0) {
        return sendError(res, 404, 'Belirtilen daire bulunamadı');
      }
    }

    // Plaka numarası değiştiriliyorsa duplicate(çakışma olur mu diye) kontrolü
    if (plateNumber) {
      const cleanPlate = plateNumber.toUpperCase().trim();
      const duplicateCheck = await db.request()
        .input('pId', plateId)
        .input('plate', cleanPlate)
        .input('aptCode', apartmentCode)
        .query('SELECT plateId FROM Plates WHERE apartmentCode = @aptCode AND plateNumber = @plate AND plateId != @pId');

      if (duplicateCheck.recordset.length > 0) {
        return sendError(res, 409, 'Bu plaka başka bir kayıtta mevcut');
      }
    }

    const result = await db.request()
      .input('pId', plateId)
      .input('plateNum', plateNumber ? plateNumber.toUpperCase().trim() : null)
      .input('owner', ownerName !== undefined ? ownerName : null)
      .input('fId', flatId !== undefined ? flatId : null)
      .input('model', vehicleModel !== undefined ? vehicleModel : null)
      .input('clr', color !== undefined ? color : null)
      .query(`
        UPDATE Plates
        SET 
          plateNumber = ISNULL(@plateNum, plateNumber),
          ownerName = @owner,
          flatId = @fId,
          vehicleModel = @model,
          color = @clr
        OUTPUT INSERTED.*
        WHERE plateId = @pId
      `);

    return sendSuccess(res, 200, 'Plaka güncellendi', { 
      plate: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Plaka güncelleme hatası:', err);
    return sendError(res, 500, 'Plaka güncellenirken hata oluştu');
  }
}

async function deletePlate(req, res) {
  try {
    const plateId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(plateId)) {
      return sendError(res, 400, 'Geçersiz plaka ID');
    }

    const result = await db.request()
      .input('pId', plateId)
      .input('aptCode', apartmentCode)
      .query('DELETE FROM Plates WHERE plateId = @pId AND apartmentCode = @aptCode');

    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Plaka bulunamadı');
    }

    return sendSuccess(res, 200, 'Plaka silindi');
    
  } catch (err) {
    console.error('Plaka silme hatası:', err);
    return sendError(res, 500, 'Plaka silinirken hata oluştu');
  }
}

module.exports = {
  addPlate,
  getPlates,
  getPlateById,
  updatePlate,
  deletePlate
};