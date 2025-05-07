// استيراد المكتبات المطلوبة
const { Sequelize } = require('sequelize');
const config = require('../config');

// إنشاء اتصال قاعدة البيانات
const sequelize = new Sequelize(config.dbUrl, {
    dialect: 'postgres',
    logging: false, // إيقاف سجلات SQL
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // مطلوب لـ Render.com
        }
    }
});

// تعريف النماذج
const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// استيراد النماذج
db.User = require('./user')(sequelize, Sequelize);
db.Contestant = require('./contestant')(sequelize, Sequelize);
db.Supervisor = require('./supervisor')(sequelize, Sequelize);
db.Competition = require('./competition')(sequelize, Sequelize);
db.Score = require('./score')(sequelize, Sequelize);

// تعريف العلاقات بين النماذج

// علاقة المتسابقة بالمشرفة (متسابقة واحدة لها مشرفة واحدة)
db.Contestant.belongsTo(db.Supervisor, {
    foreignKey: 'supervisorId',
    as: 'supervisor'
});
db.Supervisor.hasMany(db.Contestant, {
    foreignKey: 'supervisorId',
    as: 'contestants'
});

// علاقات الدرجات
db.Score.belongsTo(db.Contestant, {
    foreignKey: 'contestantId',
    as: 'contestant'
});
db.Score.belongsTo(db.Competition, {
    foreignKey: 'competitionId',
    as: 'competition'
});
db.Score.belongsTo(db.Supervisor, {
    foreignKey: 'supervisorId',
    as: 'supervisor'
});

// علاقات عكسية للدرجات
db.Contestant.hasMany(db.Score, {
    foreignKey: 'contestantId',
    as: 'scores'
});
db.Competition.hasMany(db.Score, {
    foreignKey: 'competitionId',
    as: 'scores'
});
db.Supervisor.hasMany(db.Score, {
    foreignKey: 'supervisorId',
    as: 'givenScores'
});

// مزامنة قاعدة البيانات
const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('تم الاتصال بقاعدة البيانات بنجاح');
        
        // مزامنة النماذج مع قاعدة البيانات
        await sequelize.sync({ alter: true });
        console.log('تم مزامنة جميع النماذج مع قاعدة البيانات');
    } catch (error) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', error);
    }
};

// تشغيل المزامنة
syncDatabase();

module.exports = db;
