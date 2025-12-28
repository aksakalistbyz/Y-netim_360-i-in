const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/* ============================================================
   1) YENİ GELİR / GİDER KAYDI EKLEME (ADMIN)
============================================================ */
async function addRecord(req, res) {
  try {
    const { type, description, amount, category, date, receiptUrl } = req.body;
    const apartmentCode = req.user.apartmentCode;
    const createdBy = req.user.userId;

    if (!type || !description || !amount) {
      return sendError(res, 400, 'Tür, açıklama ve tutar zorunludur');
    }

    if (!['income', 'expense'].includes(type)) {
      return sendError(res, 400, 'Tür sadece income veya expense olabilir');
    }

    const db = getDatabasePool();

    const result = await db.request()
      .input('aptCode', apartmentCode)
      .input('type', type)
      .input('description', description)
      .input('amount', amount)
      .input('category', category || 'Diğer')
      .input('date', date || new Date())
      .input('receiptUrl', receiptUrl || null)
      .input('createdBy', createdBy)
      .query(`
        INSERT INTO FinanceRecords 
        (apartmentCode, type, description, amount, category, transactionDate, receiptUrl, createdBy, createdAt)
        OUTPUT INSERTED.*
        VALUES 
        (@aptCode, @type, @description, @amount, @category, @date, @receiptUrl, @createdBy, GETDATE())
      `);

    return sendSuccess(res, 201, 'Kayıt eklendi', {
      record: result.recordset[0]
    });

  } catch (err) {
    console.error('Kayıt ekleme hatası:', err);
    return sendError(res, 500, 'Kayıt eklenemedi');
  }
}

/* ============================================================
   2) TÜM KAYITLARI LİSTELEME
============================================================ */
async function getRecords(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { type, category, startDate, endDate } = req.query;
    const db = getDatabasePool();

    let query = `
      SELECT fr.*, 
             u.fullName AS createdByName
      FROM FinanceRecords fr
      LEFT JOIN Users u ON fr.createdBy = u.userId
      WHERE fr.apartmentCode = @aptCode
    `;

    const request = db.request().input('aptCode', apartmentCode);

    if (type) {
      query += ' AND fr.type = @type';
      request.input('type', type);
    }
    if (category) {
      query += ' AND fr.category = @category';
      request.input('category', category);
    }
    if (startDate) {
      query += ' AND fr.transactionDate >= @startDate';
      request.input('startDate', startDate);
    }
    if (endDate) {
      query += ' AND fr.transactionDate <= @endDate';
      request.input('endDate', endDate);
    }

    query += ' ORDER BY fr.transactionDate DESC';

    const result = await request.query(query);

    return sendSuccess(res, 200, 'Kayıtlar listelendi', {
      records: result.recordset,
      total: result.recordset.length
    });

  } catch (err) {
    console.error('Listeleme hatası:', err);
    return sendError(res, 500, 'Kayıtlar listelenemedi');
  }
}

/* ============================================================
   3) TEK KAYIT GETİRME
============================================================ */
async function getRecordById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz kayıt ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT fr.*, 
               u.fullName AS createdByName,
               u.email AS createdByEmail
        FROM FinanceRecords fr
        LEFT JOIN Users u ON fr.createdBy = u.userId
        WHERE fr.recordId = @id AND fr.apartmentCode = @aptCode
      `);

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Kayıt bulunamadı');
    }

    return sendSuccess(res, 200, 'Kayıt bulundu', {
      record: result.recordset[0]
    });

  } catch (err) {
    console.error('Getirme hatası:', err);
    return sendError(res, 500, 'Kayıt getirilemedi');
  }
}

/* ============================================================
   4) FİNANSAL ÖZET (Dashboard için)
============================================================ */
async function getSummary(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { startDate, endDate } = req.query;
    const db = getDatabasePool();

    let dateFilter = '';
    const request = db.request().input('aptCode', apartmentCode);

    if (startDate) {
      dateFilter += ' AND transactionDate >= @startDate';
      request.input('startDate', startDate);
    }
    if (endDate) {
      dateFilter += ' AND transactionDate <= @endDate';
      request.input('endDate', endDate);
    }

    const result = await request.query(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS balance,
        COUNT(CASE WHEN type = 'income' THEN 1 END) AS incomeCount,
        COUNT(CASE WHEN type = 'expense' THEN 1 END) AS expenseCount
      FROM FinanceRecords
      WHERE apartmentCode = @aptCode ${dateFilter}
    `);

    return sendSuccess(res, 200, 'Finansal özet', {
      summary: result.recordset[0]
    });

  } catch (err) {
    console.error('Özet hatası:', err);
    return sendError(res, 500, 'Finansal özet alınamadı');
  }
}

/* ============================================================
   5) DETAYLI RAPOR
============================================================ */
async function getDetailedReport(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { startDate, endDate } = req.query;
    const db = getDatabasePool();

    let dateFilter = '';
    const request = db.request().input('aptCode', apartmentCode);

    if (startDate) {
      dateFilter += ' AND transactionDate >= @startDate';
      request.input('startDate', startDate);
    }
    if (endDate) {
      dateFilter += ' AND transactionDate <= @endDate';
      request.input('endDate', endDate);
    }

    const expensesByCategory = await request.query(`
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM FinanceRecords
      WHERE apartmentCode = @aptCode AND type = 'expense' ${dateFilter}
      GROUP BY category
      ORDER BY total DESC
    `);

    const incomeByCategory = await request.query(`
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM FinanceRecords
      WHERE apartmentCode = @aptCode AND type = 'income' ${dateFilter}
      GROUP BY category
      ORDER BY total DESC
    `);

    const summary = await request.query(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) -
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS balance
      FROM FinanceRecords
      WHERE apartmentCode = @aptCode ${dateFilter}
    `);

    return sendSuccess(res, 200, 'Detaylı finansal rapor', {
      summary: summary.recordset[0],
      expensesByCategory: expensesByCategory.recordset,
      incomeByCategory: incomeByCategory.recordset
    });

  } catch (err) {
    console.error('Rapor hatası:', err);
    return sendError(res, 500, 'Rapor oluşturulamadı');
  }
}

/* ============================================================
   6) AYLIK RAPOR
============================================================ */
async function getMonthlyReport(req, res) {
  try {
    const apartmentCode = req.user.apartmentCode;
    const { year } = req.query;
    const db = getDatabasePool();

    const request = db.request().input('aptCode', apartmentCode);

    let yearFilter = '';
    if (year) {
      yearFilter = 'AND YEAR(transactionDate) = @year';
      request.input('year', parseInt(year));
    }

    const result = await request.query(`
      SELECT 
        MONTH(transactionDate) AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
      FROM FinanceRecords
      WHERE apartmentCode = @aptCode ${yearFilter}
      GROUP BY MONTH(transactionDate)
      ORDER BY month
    `);

    return sendSuccess(res, 200, 'Aylık rapor', {
      monthlyData: result.recordset,
      year: year || new Date().getFullYear()
    });

  } catch (err) {
    console.error('Aylık rapor hatası:', err);
    return sendError(res, 500, 'Aylık rapor oluşturulamadı');
  }
}

/* ============================================================
   7) KAYIT GÜNCELLEME
============================================================ */
async function updateRecord(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const { description, amount, category, transactionDate, receiptUrl } = req.body;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz kayıt ID');
    }

    const checkRecord = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query(`
        SELECT recordId 
        FROM FinanceRecords 
        WHERE recordId = @id AND apartmentCode = @aptCode
      `);

    if (checkRecord.recordset.length === 0) {
      return sendError(res, 404, 'Kayıt bulunamadı');
    }

    const result = await db.request()
      .input('id', id)
      .input('description', description)
      .input('amount', amount)
      .input('category', category)
      .input('date', transactionDate)
      .input('receiptUrl', receiptUrl)
      .query(`
        UPDATE FinanceRecords
        SET 
          description = ISNULL(@description, description),
          amount = ISNULL(@amount, amount),
          category = ISNULL(@category, category),
          transactionDate = ISNULL(@date, transactionDate),
          receiptUrl = ISNULL(@receiptUrl, receiptUrl)
        OUTPUT INSERTED.*
        WHERE recordId = @id
      `);

    return sendSuccess(res, 200, 'Kayıt güncellendi', {
      record: result.recordset[0]
    });

  } catch (err) {
    console.error('Güncelleme hatası:', err);
    return sendError(res, 500, 'Kayıt güncellenemedi');
  }
}

/* ============================================================
   8) KAYIT SİLME
============================================================ */
async function deleteRecord(req, res) {
  try {
    const id = parseInt(req.params.id);
    const apartmentCode = req.user.apartmentCode;
    const db = getDatabasePool();

    if (isNaN(id)) {
      return sendError(res, 400, 'Geçersiz kayıt ID');
    }

    const result = await db.request()
      .input('id', id)
      .input('aptCode', apartmentCode)
      .query(`
        DELETE FROM FinanceRecords 
        WHERE recordId = @id AND apartmentCode = @aptCode
      `);

    if (result.rowsAffected[0] === 0) {
      return sendError(res, 404, 'Kayıt bulunamadı');
    }

    return sendSuccess(res, 200, 'Kayıt silindi');

  } catch (err) {
    console.error('Silme hatası:', err);
    return sendError(res, 500, 'Kayıt silinemedi');
  }
}

module.exports = {
  addRecord,
  getRecords,
  getRecordById,
  getSummary,
  getDetailedReport,
  getMonthlyReport,
  updateRecord,
  deleteRecord
};