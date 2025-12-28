const sql = require('mssql');
require('dotenv').config();

// Veritabanı ayarları
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let connectionPool;

// Veritabanına bağlanmak için
async function connectDatabase() {
  try {
    connectionPool = await sql.connect(dbConfig);
    console.log('Veritabanı bağlantısı başarılı');
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error.message);
    // process.exit(1);
  }
}

// Bağlantıyı döndürmek için
function getDatabasePool() {
  if (!connectionPool) {
    throw new Error('Veritabanı bağlantısı yok!');
  }
  return connectionPool;
}

module.exports = { connectDatabase, getDatabasePool };