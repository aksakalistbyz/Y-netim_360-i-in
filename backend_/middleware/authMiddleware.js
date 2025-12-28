const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHandler');

// Token kontrolü
function checkAuthentication(req, res, next) {
  let token;

  // Header'dan token'ı al
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Token yoksa
  if (!token) {
    return sendError(res, 401, 'Giriş yapmanız gerekiyor');
  }

  try {
    // Token'ı doğrula
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcı bilgilerini req.user içine koy
    req.user = {
      userId: decodedData.userId,
      email: decodedData.email,
      role: decodedData.role,
      apartmentCode: decodedData.apartmentCode,  // EKLENDİ
      flatId: decodedData.flatId                // EKLENDİ
    };

    next(); // Devam et
  } catch (error) {
    return sendError(res, 401, 'Geçersiz veya süresi dolmuş token');
  }
}

// Admin kontrolü
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Yönetici yetkisi gerekli');
  }
  next();
}

module.exports = { checkAuthentication, requireAdmin };