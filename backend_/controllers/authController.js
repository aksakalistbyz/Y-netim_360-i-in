const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabasePool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Token oluştur
function createToken(userInfo) {
  return jwt.sign(
    {
      userId: userInfo.userId,
      email: userInfo.email,
      role: userInfo.role,
      apartmentCode: userInfo.apartmentCode,
      flatId: userInfo.flatId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
}

// KAYIT İŞLEMİ (register)
async function registerUser(req, res) {
  try {
    const { name, email, password, phoneNumber, role, apartmentCode, flatCount, flatId } = req.body;

    // Validation
    let firstName = "";
    let lastName = "";
    if (name) {
      const parts = name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }

    const db = getDatabasePool();

    // Email kontrolü
    const existingUser = await db.request()
      .input('email', email)
      .query('SELECT userId FROM Users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return sendError(res, 400, 'Bu email zaten kayıtlı');
    }

    // Şifre hash
    const hashedPassword = await bcrypt.hash(password, 10);

    let finalApartmentCode = apartmentCode;
    let userFlatId = null;

    // YÖNETİCİ KAYDI
    if (role === 'admin') {
      // Yeni apartman kodu oluştur
      finalApartmentCode = 'APT' + Date.now().toString().substring(7);

      console.log(`🏢 Yeni apartman oluşturuluyor: ${finalApartmentCode}`);

      // Kullanıcıyı kaydet
      const userResult = await db.request()
        .input('email', email)
        .input('password', hashedPassword)
        .input('firstName', firstName)
        .input('lastName', lastName)
        .input('phone', phoneNumber || null)
        .input('role', role)
        .input('apartmentCode', finalApartmentCode)
        .query(`
          INSERT INTO Users (email, password, firstName, lastName, phoneNumber, role, apartmentCode, createdAt)
          OUTPUT INSERTED.*
          VALUES (@email, @password, @firstName, @lastName, @phone, @role, @apartmentCode, GETDATE())
        `);

      const newUser = userResult.recordset[0];

      // OTOPARK SLOTLARI OLUŞTUR (10 adet)
      console.log(`🚗 10 otopark slotu oluşturuluyor...`);
      for (let i = 1; i <= 10; i++) {
        await db.request()
          .input('aptCode', finalApartmentCode)
          .input('slotNum', i.toString())
          .query(`
            INSERT INTO ParkingSlots (apartmentCode, slotNumber, floor, block, type, isOccupied, createdAt)
            VALUES (@aptCode, @slotNum, NULL, NULL, 'normal', 0, GETDATE())
          `);
      }
      console.log(`✅ 10 otopark slotu oluşturuldu`);

      // DAİRELERİ OLUŞTUR (flatCount kadar)
      const numberOfFlats = parseInt(flatCount) || 10; // Varsayılan 10
      console.log(`🏠 ${numberOfFlats} daire oluşturuluyor...`);

      for (let i = 1; i <= numberOfFlats; i++) {
        await db.request()
          .input('aptCode', finalApartmentCode)
          .input('flatNum', i.toString())
          .input('block', 'A') // Varsayılan blok
          .input('floor', Math.ceil(i / 4)) // Her 4 dairede bir kat
          .query(`
            INSERT INTO Flats (apartmentCode, flatNumber, block, floor, residentCount, createdAt)
            VALUES (@aptCode, @flatNum, @block, @floor, 0, GETDATE())
          `);
      }
      console.log(`✅ ${numberOfFlats} daire oluşturuldu`);

      const token = createToken(newUser);

      return sendSuccess(res, 201, 'Kayıt başarılı', {
        token: token,
        user: newUser
      });
    }

    // SAKİN KAYDI
    else if (role === 'resident') {
      // Apartman kodu kontrolü
      const apartmentCheck = await db.request()
        .input('code', apartmentCode)
        .query("SELECT userId FROM Users WHERE apartmentCode = @code AND role = 'admin'");

      if (apartmentCheck.recordset.length === 0) {
        return sendError(res, 400, 'Geçersiz apartman kodu');
      }

      // Daire kontrolü (flatId gönderilmişse)
      if (flatId) {
        const flatCheck = await db.request()
          .input('fId', parseInt(flatId))
          .input('aptCode', apartmentCode)
          .query('SELECT flatId FROM Flats WHERE flatId = @fId AND apartmentCode = @aptCode');

        if (flatCheck.recordset.length === 0) {
          return sendError(res, 400, 'Geçersiz daire seçimi');
        }

        userFlatId = parseInt(flatId);
      }

      // Kullanıcıyı kaydet
      const userResult = await db.request()
        .input('email', email)
        .input('password', hashedPassword)
        .input('firstName', firstName)
        .input('lastName', lastName)
        .input('phone', phoneNumber || null)
        .input('role', role)
        .input('apartmentCode', apartmentCode)
        .input('flatId', userFlatId)
        .query(`
          INSERT INTO Users (email, password, firstName, lastName, phoneNumber, role, apartmentCode, flatId, createdAt)
          OUTPUT INSERTED.*
          VALUES (@email, @password, @firstName, @lastName, @phone, @role, @apartmentCode, @flatId, GETDATE())
        `);

      const newUser = userResult.recordset[0];
      const token = createToken(newUser);

      return sendSuccess(res, 201, 'Kayıt başarılı', {
        token: token,
        user: newUser
      });
    }

  } catch (error) {
    console.error('Kayıt hatası:', error);
    return sendError(res, 500, 'Kayıt işlemi sırasında hata oluştu');
  }
}

// GİRİŞ İŞLEMİ (login)
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDatabasePool();

    const result = await db.request()
      .input('email', email)
      .query('SELECT * FROM Users WHERE email = @email');

    if (result.recordset.length === 0) {
      return sendError(res, 401, 'Email veya şifre hatalı');
    }

    const user = result.recordset[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return sendError(res, 401, 'Email veya şifre hatalı');
    }

    const token = createToken(user);
    delete user.password;

    return sendSuccess(res, 200, 'Giriş başarılı', {
      token: token,
      user: user
    });

  } catch (error) {
    console.error('Giriş hatası:', error);
    return sendError(res, 500, 'Giriş işlemi sırasında hata oluştu');
  }
}

// ÇIKIŞ İŞLEMİ (logout)
async function logoutUser(req, res) {
  return sendSuccess(res, 200, 'Çıkış başarılı');
}

// PROFİL BİLGİLERİ
async function getUserProfile(req, res) {
  try {
    const db = getDatabasePool();

    const result = await db.request()
      .input('userId', req.user.userId)
      .query('SELECT userId, email, firstName, lastName, phoneNumber, role, apartmentCode, flatId FROM Users WHERE userId = @userId');

    if (result.recordset.length === 0) {
      return sendError(res, 404, 'Kullanıcı bulunamadı');
    }

    return sendSuccess(res, 200, 'Profil bilgileri', {
      user: result.recordset[0]
    });

  } catch (error) {
    console.error('Profil hatası:', error);
    return sendError(res, 500, 'Profil bilgileri alınamadı');
  }
}

// TOKEN DOĞRULAMA
async function verifyUserToken(req, res) {
  return sendSuccess(res, 200, 'Token geçerli', {
    user: req.user
  });
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  verifyUserToken
};