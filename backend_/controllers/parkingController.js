const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Yeni otopark yeri ekle (admin)
async function addSlot(req, res) {
  try {
    const { slotNumber, floor, block, type } = req.body;
    const apartmentCode = req.user.apartmentCode;

    if (!slotNumber) {
      return sendError(res, 400, 'Slot numarası zorunludur');
    }

    const db = getDatabasePool();
    
    // Aynı numara var mı kontrol edelim
    const check = await db.request()
      .input('aptCode', apartmentCode)
      .input('slotNumber', slotNumber)
      .query('SELECT slotId FROM ParkingSlots WHERE apartmentCode = @aptCode AND slotNumber = @slotNumber');

    if (check.recordset.length > 0) {
      return sendError(res, 409, 'Bu slot numarası zaten kayıtlı');
    }

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('slotNumber', slotNumber)
      .input('floor', floor || null)
      .input('block', block || null)
      .input('type', type || 'normal')
      .query(`
        INSERT INTO ParkingSlots (apartmentCode, slotNumber, floor, block, type, isOccupied, createdAt)
        OUTPUT INSERTED.*
        VALUES (@aptCode, @slotNumber, @floor, @block, @type, 0, GETDATE())
      `);

    return sendSuccess(res, 201, 'Otopark yeri eklendi', { 
      slot: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Slot ekleme hatası:', err);
    return sendError(res, 500, 'Otopark yeri eklenemedi');
  }
}

// Tüm otopark yerlerini listeleme
async function getSlots(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { status, floor } = req.query;
    const db = getDatabasePool();

    let query = `
      SELECT ps.*, 
             f.flatNumber,
             f.block as flatBlock,
             p.plateNumber,
             p.ownerName
      FROM ParkingSlots ps
      LEFT JOIN Flats f ON ps.flatId = f.flatId
      LEFT JOIN Plates p ON ps.plateId = p.plateId
      WHERE ps.apartmentCode = @aptCode
    `;

    const request = db.request().input('aptCode', apartmentCode);

    if (status === 'occupied') {
      query += ' AND ps.isOccupied = 1';
    } else if (status === 'empty') {
      query += ' AND ps.isOccupied = 0';
    }

    if (floor) {
      query += ' AND ps.floor = @floor';
      request.input('floor', parseInt(floor));
    }

    query += ' ORDER BY CAST(ps.slotNumber AS INT)';

    const result = await request.query(query);


    // Özet bilgi
    const summary = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN isOccupied = 1 THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN isOccupied = 0 THEN 1 ELSE 0 END) as empty
        FROM ParkingSlots
        WHERE apartmentCode = @aptCode
      `);

    return sendSuccess(res, 200, 'Otopark yerleri listelendi', { 
      slots: result.recordset,
      summary: summary.recordset[0]
    });
    
  } catch (err) {
    console.error('Listeleme hatası:', err);
    return sendError(res, 500, 'Otopark yerleri listelenemedi');
  }
}

// Tek slot detayı
async function getSlotById(req, res) {
  try {
    const slotId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(slotId)) {
      return sendError(res, 400, 'Geçersiz slot ID');
    }

    const result = await db.request()
      .input('slotId', slotId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT ps.*, 
               f.flatNumber,
               p.plateNumber,
               p.ownerName,
               p.vehicleModel
        FROM ParkingSlots ps
        LEFT JOIN Flats f ON ps.flatId = f.flatId
        LEFT JOIN Plates p ON ps.plateId = p.plateId
        WHERE ps.slotId = @slotId AND ps.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Slot bulunamadı');
    }

    return sendSuccess(res, 200, 'Slot bulundu', { 
      slot: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Slot getirme hatası:', err);
    return sendError(res, 500, 'Slot getirilemedi');
  }
}

// Araç park etme için (slot doldurmak için)
async function assignVehicle(req, res) {
  try {
    const slotId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { flatId, plateId } = req.body;
    const db = getDatabasePool();

    if (isNaN(slotId)) {
      return sendError(res, 400, 'Geçersiz slot ID');
    }

    if (!flatId || !plateId) {
      return sendError(res, 400, 'Daire ve plaka bilgisi zorunludur');
    }

    // Slot boş mu kontrol edelim
    const slotCheck = await db.request()
      .input('slotId', slotId)
      .input('aptCode', apartmentCode)
      .query('SELECT isOccupied FROM ParkingSlots WHERE slotId = @slotId AND apartmentCode = @aptCode');

    if (slotCheck.recordset.length === 0) {
      return sendError(res, 404, 'Slot bulunamadı');
    }

    if (slotCheck.recordset[0].isOccupied === 1) {
      return sendError(res, 400, 'Bu slot zaten dolu');
    }

    // Daire kontrolü
    const flatCheck = await db.request()
      .input('flatId', flatId)
      .input('aptCode', apartmentCode)
      .query('SELECT flatId FROM Flats WHERE flatId = @flatId AND apartmentCode = @aptCode');

    if (flatCheck.recordset.length === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }

    // Plaka kontrolü
    const plateCheck = await db.request()
      .input('plateId', plateId)
      .input('aptCode', apartmentCode)
      .query('SELECT plateId FROM Plates WHERE plateId = @plateId AND apartmentCode = @aptCode');

    if (plateCheck.recordset.length === 0) {
      return sendError(res, 404, 'Plaka bulunamadı');
    }

    const result = await db.request()
      .input('slotId', slotId)
      .input('flatId', flatId)
      .input('plateId', plateId)
      .query(`
        UPDATE ParkingSlots
        SET isOccupied = 1,
            flatId = @flatId,
            plateId = @plateId,
            updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE slotId = @slotId
      `);

    return sendSuccess(res, 200, 'Araç park edildi', { 
      slot: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Araç park etme hatası:', err);
    return sendError(res, 500, 'Araç park edilemedi');
  }
}

// Araç çıkartmak için
async function removeVehicle(req, res) {
  try {
    const slotId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(slotId)) {
      return sendError(res, 400, 'Geçersiz slot ID');
    }

    const result = await db.request()
      .input('slotId', slotId)
      .input('aptCode', apartmentCode)
      .query(`
        UPDATE ParkingSlots
        SET isOccupied = 0,
            flatId = NULL,
            plateId = NULL,
            updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE slotId = @slotId AND apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Slot bulunamadı');
    }

    return sendSuccess(res, 200, 'Araç çıkartıldı', { 
      slot: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Araç çıkartma hatası:', err);
    return sendError(res, 500, 'Araç çıkartılamadı');
  }
}

// Dolu slotları listele
async function getOccupiedSlots(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT ps.*, 
               f.flatNumber,
               p.plateNumber,
               p.ownerName
        FROM ParkingSlots ps
        LEFT JOIN Flats f ON ps.flatId = f.flatId
        LEFT JOIN Plates p ON ps.plateId = p.plateId
        WHERE ps.apartmentCode = @aptCode AND ps.isOccupied = 1
        ORDER BY ps.slotNumber
      `);

    return sendSuccess(res, 200, 'Dolu slotlar listelendi', { 
      slots: result.recordset,
      total: result.recordset.length
    });
    
  } catch (err) {
    console.error('Dolu slot listeleme hatası:', err);
    return sendError(res, 500, 'Dolu slotlar listelenemedi');
  }
}

// Boş slotları listele
async function getAvailableSlots(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT * FROM ParkingSlots 
        WHERE apartmentCode = @aptCode AND isOccupied = 0
        ORDER BY slotNumber
      `);

    return sendSuccess(res, 200, 'Boş slotlar listelendi', { 
      slots: result.recordset,
      total: result.recordset.length
    });
    
  } catch (err) {
    console.error('Boş slot listeleme hatası:', err);
    return sendError(res, 500, 'Boş slotlar listelenemedi');
  }
}

// Slot sil (admin)
async function deleteSlot(req, res) {
  try {
    const slotId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(slotId)) {
      return sendError(res, 400, 'Geçersiz slot ID');
    }

    // Dolu mu kontrol edelim
    const checkOccupied = await db.request()
      .input('slotId', slotId)
      .input('aptCode', apartmentCode)
      .query('SELECT isOccupied FROM ParkingSlots WHERE slotId = @slotId AND apartmentCode = @aptCode');

    if (checkOccupied.recordset.length === 0) {
      return sendError(res, 404, 'Slot bulunamadı');
    }

    if (checkOccupied.recordset[0].isOccupied === 1) {
      return sendError(res, 400, 'Dolu slot silinemez. Önce aracı çıkartın');
    }

    const result = await db.request()
      .input('slotId', slotId)
      .input('aptCode', apartmentCode)
      .query('DELETE FROM ParkingSlots WHERE slotId = @slotId AND apartmentCode = @aptCode');

    return sendSuccess(res, 200, 'Slot silindi');
    
  } catch (err) {
    console.error('Slot silme hatası:', err);
    return sendError(res, 500, 'Slot silinemedi');
  }
}

// otopark dolu/boş değiştir mek için basit toggle oluşturduk.
async function toggleSlot(req, res) {
  try {
    const slotNumber = req.params.id; // Frontend slotNumber gönderiyor 
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    console.log(`Toggle çağrıldı - slotNumber: ${slotNumber}, apartmentCode: ${apartmentCode}`);

    const check = await db.request()
      .input('slotNum', slotNumber.toString())
      .input('aptCode', apartmentCode)
      .query('SELECT slotId, isOccupied, slotNumber FROM ParkingSlots WHERE slotNumber = @slotNum AND apartmentCode = @aptCode');

    if (check.recordset.length === 0) {
      console.log('Slot bulunamadı!');
      return sendError(res, 404, 'Slot bulunamadı');
    }

    const slot = check.recordset[0];

    const currentStatus = slot.isOccupied ? 1 : 0;
    const newStatus = currentStatus === 1 ? 0 : 1;

    console.log(`SlotID: ${slot.slotId}, Mevcut durum: ${currentStatus}, Yeni durum: ${newStatus}`);

    const result = await db.request()
      .input('slotId', slot.slotId)
      .input('newStatus', newStatus)
      .query(`
        UPDATE ParkingSlots
        SET isOccupied = @newStatus,
            flatId = NULL,
            plateId = NULL,
            updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE slotId = @slotId
      `);

    console.log(`Slot güncellendi:`, result.recordset[0]);

    return sendSuccess(res, 200, 'Slot güncellendi', { 
      slot: result.recordset[0] 
    });
    
  } catch (err) {
    console.error('Toggle hatası:', err);
    return sendError(res, 500, 'Slot güncellenemedi');
  }
}

module.exports = {
  addSlot,
  getSlots,
  getSlotById,
  assignVehicle,
  removeVehicle,
  getOccupiedSlots,
  getAvailableSlots,
  deleteSlot,
  toggleSlot 
};