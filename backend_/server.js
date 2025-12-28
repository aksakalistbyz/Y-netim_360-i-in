const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv'); //.env dosyasını okumak için
const { connectDatabase } = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser (JSON verileri okumak için)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// İstek loglama (development modunda)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Management 360 API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      profile: 'GET /api/auth/profile',
      verify: 'GET /api/auth/verify'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);

app.use('/api/flats', require('./routes/flatRoutes'));

app.use('/api/plates', require('./routes/plateRoutes'));

app.use('/api/fees', require('./routes/aidatRoutes'));

app.use('/api/announcements', require('./routes/duyuruRoutes'));

app.use('/api/parking', require('./routes/parkingRoutes'));

app.use('/api/finance', require('./routes/financeRoutes'));

app.use('/api/messages', require('./routes/messageRoutes'));


app.get('/api/test', (req, res) => {
  res.json({ message: "Backend çalışıyor!" });
});

// 404 Handler (Endpoint bulunamadı)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint bulunamadı: ${req.method} ${req.path}`
  });
});

// Error Handler (Sunucu hatası)
app.use((err, req, res, next) => {
  console.error('Sunucu hatası:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucuda bir hata oluştu'
  });
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error('DB bağlantısı başarısız, mock(sahte) modda devam ediliyor:', error);
    process.exit(1);
  }
    app.listen(PORT, () => {
      console.log('Management 360 Backend');
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Mod: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${new Date().toLocaleString('tr-TR')}`);
    });
  
}

process.on('SIGINT', () => {
  console.log('\n Sunucu kapatılıyor...');
  process.exit(0);
});



startServer();
