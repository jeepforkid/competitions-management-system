// استيراد المتغيرات البيئية
const dotenv = require('dotenv');
dotenv.config();

// تكوين إعدادات التطبيق
module.exports = {
    // منفذ الخادم
    port: process.env.PORT || 3000,
    
    // رابط قاعدة البيانات
    dbUrl: process.env.DATABASE_URL,
    
    // المفتاح السري للجلسات
    sessionSecret: process.env.SESSION_SECRET,
    
    // إعدادات قاعدة البيانات
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
};
