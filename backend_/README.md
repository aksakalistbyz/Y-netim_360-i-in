# Apartman Yönetim Sistemi - Backend

Node.js ve Express ile geliştirilmiş apartman yönetim sistemi API'si.

## Özellikler

- Daire Yönetimi
- Plaka Kayıt Sistemi
- Aidat Takibi
- Duyuru Yönetimi
- Otopark Yönetimi
- Gelir-Gider Takibi
- Mesajlaşma Sistemi
- JWT Authentication

## Gereksinimler

- Node.js (v16 veya üzeri)
- SQL Server
- npm

## Kurulum

1. Repository'yi klonlayın
```bash
git clone https://github.com/kullanici-adi/apartman-backend.git
cd apartman-backend
```

2. Bağımlılıkları yükleyin
```bash
npm install
```

3. .env dosyası oluşturun

.env.example dosyasını kopyalayarak .env adıyla kaydedin ve gerekli bilgileri girin:
```
DB_SERVER=localhost
DB_NAME=ApartmanYonetim
DB_USER=sa
DB_PASSWORD=your_password
DB_PORT=1433
JWT_SECRET=your_secret_key
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Veritabanını kurun

SQL Server'da database.sql dosyasını çalıştırın.

5. Sunucuyu başlatın
```bash
npm start
```

Sunucu http://localhost:4000 adresinde çalışacaktır.

## API Endpoints
```
/api/auth          - Kimlik doğrulama (login, register)
/api/flats         - Daire yönetimi
/api/plates        - Plaka kayıtları
/api/fees          - Aidat yönetimi
/api/announcements - Duyurular
/api/parking       - Otopark yönetimi
/api/finance       - Gelir-Gider takibi
/api/messages      - Mesajlaşma
```

## Proje Yapısı
```
backend/
├── config/
│   └── db.js
├── controllers/
│   ├── aidatController.js
│   ├── duyuruController.js
│   ├── financeController.js
│   ├── flatController.js
│   ├── messagesController.js
│   ├── parkingController.js
│   └── plateController.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── aidatRoutes.js
│   ├── authRoutes.js
│   ├── duyuruRoutes.js
│   ├── financeRoutes.js
│   ├── flatRoutes.js
│   ├── messageRoutes.js
│   ├── parkingRoutes.js
│   └── plateRoutes.js
├── utils/
│   └── responseHandler.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Test

Postman veya Thunder Client ile API endpoint'lerini test edebilirsiniz.

Örnek istek:
```
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

## Ekip

- Backend: [Beyza]
- Frontend: [Esma_Nur]
- Database: [Sare_Ravzanur]

## Lisans

Bu proje eğitim amaçlı geliştirilmiştir.