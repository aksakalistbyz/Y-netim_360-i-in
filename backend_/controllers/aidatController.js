const sql = require('mssql');
const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

  // 1) TOPLU AİDAT OLUŞTURMA (TÜM DAİRELER)

async function createDuesPeriod(req, res) {
  try {
    const { month, year, amount, dueDate, description } = req.body;
    const apartmentCode = req.user.apartmentCode;

    if (!month || !year || !amount) {
      return sendError(res, 400, 'Ay, yıl ve tutar zorunludur');
    }

    if (month < 1 || month > 12) {
      return sendError(res, 400, 'Geçersiz ay değeri');
    }

    const db = getDatabasePool();

    // Aynı dönem daha önce oluşturulmuş mu?
    const periodCheck = await db.request()
      .input('aptCode', apartmentCode)
      .input('mnth', month)
      .input('yr', year)
      .query(`
        SELECT feeId 
        FROM Fees 
        WHERE apartmentCode = @aptCode AND month = @mnth AND year = @yr
      `);

    if (periodCheck.recordset.length > 0) {
      return sendError(res, 409, 'Bu dönem için aidat zaten oluşturulmuş');
    }

    // Tüm daireleri almak için
    const flats = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT flatId 
        FROM Flats 
        WHERE apartmentCode = @aptCode
      `);

    if (flats.recordset.length === 0) {
      return sendError(res, 404, 'Kayıtlı daire bulunamadı');
    }

    // MSSQL TRANSACTION
    const transaction = new sql.Transaction(db);
    await transaction.begin();

    try {
      for (const flat of flats.recordset) {
        await transaction.request()
          .input('aptCode', apartmentCode)
          .input('fId', flat.flatId)
          .input('amt', amount)
          .input('due', dueDate || null)
          .input('mnth', month)
          .input('yr', year)
          .input('desc', description || null)
          .query(`
            INSERT INTO Fees 
            (apartmentCode, flatId, amount, dueDate, month, year, description, status, createdAt)
            VALUES 
            (@aptCode, @fId, @amt, @due, @mnth, @yr, @desc, 'pending', GETDATE())
          `);
      }

      await transaction.commit();

      return sendSuccess(res, 201, 'Aidat dönemi oluşturuldu', {
        period: `${month}/${year}`,
        totalFlats: flats.recordset.length,
        amount
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('Aidat oluşturma hatası:', err);
    return sendError(res, 500, 'Aidat dönemi oluşturulamadı');
  }
}

//2) TEK DAİREYE AİDAT EKLEME

async function addFee(req, res) {
  try {
    const { flatId, amount, dueDate, month, year, description } = req.body;
    const apartmentCode = req.user.apartmentCode;

    if (!flatId || !amount) {
      return sendError(res, 400, 'Daire ve tutar zorunludur');
    }

    const db = getDatabasePool();

    // Daire kontrolü
    const flatCheck = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT flatId 
        FROM Flats 
        WHERE flatId = @fId AND apartmentCode = @aptCode
      `);

    if (flatCheck.recordset.length === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('fId', flatId)
      .input('amt', amount)
      .input('due', dueDate || null)
      .input('mnth', month || null)
      .input('yr', year || null)
      .input('desc', description || null)
      .query(`
        INSERT INTO Fees 
        (apartmentCode, flatId, amount, dueDate, month, year, description, status, createdAt)
        OUTPUT INSERTED.*
        VALUES 
        (@aptCode, @fId, @amt, @due, @mnth, @yr, @desc, 'pending', GETDATE())
      `);

    return sendSuccess(res, 201, 'Aidat eklendi', {
      fee: result.recordset[0]
    });

  } catch (err) {
    console.error('Aidat ekleme hatası:', err);
    return sendError(res, 500, 'Aidat eklenemedi');
  }
}
 // 3) AİDAT LİSTELEMEK için
async function getFees(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { month, year, status, flatId } = req.query;
    const db = getDatabasePool();

    let query = `
      SELECT 
        f.*, 
        fl.flatNumber, 
        fl.block, 
        fl.floor
      FROM Fees f
      LEFT JOIN Flats fl ON f.flatId = fl.flatId
      WHERE f.apartmentCode = @aptCode
    `;

    const request = db.request().input('aptCode', apartmentCode);

    if (month) {
      query += ' AND f.month = @mnth';
      request.input('mnth', parseInt(month));
    }
    if (year) {
      query += ' AND f.year = @yr';
      request.input('yr', parseInt(year));
    }
    if (status) {
      query += ' AND f.status = @st';
      request.input('st', status);
    }
    if (flatId) {
      query += ' AND f.flatId = @fId';
      request.input('fId', parseInt(flatId));
    }

    query += ' ORDER BY f.createdAt DESC';

    const result = await request.query(query);

    return sendSuccess(res, 200, 'Aidatlar listelendi', {
      fees: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Listeleme hatası:', err);
    return sendError(res, 500, 'Aidatlar listelenemedi');
  }
}
 //  4) TEK AİDAT GETİRMEK İÇİN
async function getFeeById(req, res) {
  try {
    const feeId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(feeId)) {
      return sendError(res, 400, 'Geçersiz ID');
    }

    const result = await db.request()
      .input('feeId', feeId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT 
          f.*, 
          fl.flatNumber, 
          fl.block, 
          fl.floor
        FROM Fees f
        LEFT JOIN Flats fl ON f.flatId = fl.flatId
        WHERE f.feeId = @feeId AND f.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Aidat bulunamadı');
    }

    return sendSuccess(res, 200, 'Aidat bulundu', {
      fee: result.recordset[0]
    });

  } catch (err) {
    console.error('Aidat getirme hatası:', err);
    return sendError(res, 500, 'Aidat getirilemedi');
  }
}
 //  5) AİDAT ÖDEME DURUMU GÜNCELLEME + FİNANS KAYDI EKLEME
async function updatePaymentStatus(req, res) {
  try {
    const feeId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { status, paymentMethod } = req.body;
    const db = getDatabasePool();

    if (isNaN(feeId)) {
      return sendError(res, 400, 'Geçersiz ID');
    }

    const validStatuses = ['paid', 'pending', 'overdue', 'pending_approval'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, 400, 'Geçersiz durum');
    }

    // Aidat bilgisini al (flatNumber için JOIN)
    const feeCheck = await db.request()
      .input('feeId', feeId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT f.*, fl.flatNumber
        FROM Fees f
        LEFT JOIN Flats fl ON f.flatId = fl.flatId
        WHERE f.feeId = @feeId AND f.apartmentCode = @aptCode
      `);

    if (feeCheck.recordset.length === 0) {
      return sendError(res, 404, 'Aidat bulunamadı');
    }

    const fee = feeCheck.recordset[0];

    // Ödeme güncelle
    const updated = await db.request()
      .input('feeId', feeId)
      .input('st', status)
      .input('paidDate', status === 'paid' ? new Date() : null)
      .input('method', (status === 'paid' || status === 'pending_approval') ? (paymentMethod || 'Nakit') : null)
      .query(`
        UPDATE Fees
        SET 
          status = @st,
          paidDate = @paidDate,
          paymentMethod = @method
        OUTPUT INSERTED.*
        WHERE feeId = @feeId
      `);

    // SADECE 'paid' ise finans kaydı ekle 
    if (status === 'paid') {
      await db.request()
        .input('aptCode', apartmentCode)
        .input('type', 'income')
        .input('description', `Aidat Ödemesi - Daire ${fee.flatNumber}`) 
        .input('amount', fee.amount)
        .input('category', 'Aidat')
        .input('date', new Date())
        .input('createdBy', req.user.userId)
        .query(`
          INSERT INTO FinanceRecords 
          (apartmentCode, type, description, amount, category, transactionDate, createdBy, createdAt)
          VALUES 
          (@aptCode, @type, @description, @amount, @category, @date, @createdBy, GETDATE())
        `);
    }

    return sendSuccess(res, 200, 'Ödeme durumu güncellendi', {
      fee: updated.recordset[0]
    });

  } catch (err) {
    console.error('Durum güncelleme hatası:', err);
    return sendError(res, 500, 'Ödeme durumu güncellenemedi');
  }
}
 //  6) TEK DAİRENİN BORCUNU HESAPLAMA
async function calculateDebt(req, res) {
  try {
    const flatId = parseInt(req.params.flatId);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(flatId)) {
      return sendError(res, 400, 'Geçersiz daire ID');
    }

    // Daire kontrolü
    const flatCheck = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT flatNumber, block 
        FROM Flats 
        WHERE flatId = @fId AND apartmentCode = @aptCode
      `);

    if (flatCheck.recordset.length === 0) {
      return sendError(res, 404, 'Daire bulunamadı');
    }

    // Borç hesaplama
    const result = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT 
          SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END) AS totalDebt,
          COUNT(CASE WHEN status != 'paid' THEN 1 END) AS unpaidCount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS totalPaid,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidCount
        FROM Fees
        WHERE flatId = @fId AND apartmentCode = @aptCode
      `);

    const unpaidFees = await db.request()
      .input('fId', flatId)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT feeId, amount, dueDate, month, year, status
        FROM Fees
        WHERE flatId = @fId AND apartmentCode = @aptCode AND status != 'paid'
        ORDER BY dueDate
      `);

    return sendSuccess(res, 200, 'Borç hesaplandı', {
      flat: flatCheck.recordset[0],
      totalDebt: result.recordset[0].totalDebt || 0,
      unpaidCount: result.recordset[0].unpaidCount || 0,
      totalPaid: result.recordset[0].totalPaid || 0,
      paidCount: result.recordset[0].paidCount || 0,
      unpaidFees: unpaidFees.recordset
    });

  } catch (err) {
    console.error('Borç hesaplama hatası:', err);
    return sendError(res, 500, 'Borç hesaplanamadı');
  }
}

  // 7) BORÇLU DAİRELER
async function getDebtorFlats(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT 
          fl.flatId,
          fl.flatNumber,
          fl.block,
          fl.floor,
          COUNT(f.feeId) AS unpaidCount,
          SUM(f.amount) AS totalDebt
        FROM Flats fl
        INNER JOIN Fees f ON fl.flatId = f.flatId
        WHERE fl.apartmentCode = @aptCode AND f.status != 'paid'
        GROUP BY fl.flatId, fl.flatNumber, fl.block, fl.floor
        HAVING SUM(f.amount) > 0
        ORDER BY totalDebt DESC
      `);

    return sendSuccess(res, 200, 'Borçlu daireler listelendi', {
      debtors: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Borçlu listesi hatası:', err);
    return sendError(res, 500, 'Borçlu daireler listelenemedi');
  }
}

  // 8) GENEL BORÇ ÖZETİ
async function getDebtSummary(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    const summary = await db.request()
      .input('aptCode', apartmentCode)
      .query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN status != 'paid' THEN flatId END) AS debtorCount,
          SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END) AS totalDebt,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS totalCollected
        FROM Fees
        WHERE apartmentCode = @aptCode
      `);

    return sendSuccess(res, 200, 'Genel borç özeti', {
      summary: summary.recordset[0]
    });

  } catch (err) {
    console.error('Özet hatası:', err);
    return sendError(res, 500, 'Borç özeti alınamadı');
  }
}

 //  9) AİDAT SİLMEK İÇİN
async function deleteFee(req, res) {
  try {
    const feeId = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(feeId)) {
      return sendError(res, 400, 'Geçersiz ID');
    }

    const result = await db.request()
      .input('feeId', feeId)
      .input('aptCode', apartmentCode)
      .query(`
        DELETE FROM Fees 
        WHERE feeId = @feeId AND apartmentCode = @aptCode
      `);

    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Aidat bulunamadı');
    }

    return sendSuccess(res, 200, 'Aidat silindi');

  } catch (err) {
    console.error('Silme hatası:', err);
    return sendError(res, 500, 'Aidat silinemedi');
  }
}

module.exports = {
  createDuesPeriod,
  addFee,
  getFees,
  getFeeById,
  updatePaymentStatus,
  calculateDebt,
  getDebtorFlats,
  getDebtSummary,
  deleteFee
};