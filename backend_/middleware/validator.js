const { sendError } = require('../utils/responseHandler');

function checkEmailFormat(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

function validateRegistration(req, res, next) {
  const { email, password, name, role, phoneNumber } = req.body;
  
  // Boş alan var mı?
  if (!email || !password || !name || !role) {
    return sendError(res, 400, 'Email, şifre, ad ve rol zorunludur');
  }
  
  // Email formatı doğru mu?
  if (!checkEmailFormat(email)) {
    return sendError(res, 400, 'Geçerli bir email giriniz');
  }
  
  // Şifre yeterince uzun mu?
  if (password.length < 6) {
    return sendError(res, 400, 'Şifre en az 6 karakter olmalı');
  }
  
  // Rol geçerli mi?
  if (role !== 'admin' && role !== 'resident') {
    return sendError(res, 400, 'Rol sadece admin veya resident olabilir');
  }
  
  // Sakin ise apartman kodu gerekli
  if (role === 'resident' && !req.body.apartmentCode) {
    return sendError(res, 400, 'Sakin için apartman kodu gerekli');
  }
  
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return sendError(res, 400, 'Email ve şifre gerekli');
  }
  
  if (!checkEmailFormat(email)) {
    return sendError(res, 400, 'Geçerli bir email giriniz');
  }
  
  next();
}

module.exports = { validateRegistration, validateLogin };




/*```

**Açıklama:**

### Middleware nedir?
API çağrısı yapılınca **sırayla** çalışan fonksiyonlar:
```
/*İstek gelir → validateRegistration() → authController.register() → Yanıt
             ↓ hata varsa
             sendError() → İşlem durur*/