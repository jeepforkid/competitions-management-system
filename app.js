// استيراد المكتبات المطلوبة
const express = require('express');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const config = require('./config');

// استيراد النماذج
const db = require('./models');

// إنشاء تطبيق Express
const app = express();

// إعداد محرك العرض EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// الوسائط (Middleware)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// إعداد الجلسات
// تم تعطيل ميزة الجلسات والمصادقة

// إعداد الرسائل الفلاشية
app.use(flash());

// متغيرات عامة للقوالب
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// استيراد المسارات
const contestantRoutes = require('./routes/contestants');
const supervisorRoutes = require('./routes/supervisors');
const competitionRoutes = require('./routes/competitions');
const scoreRoutes = require('./routes/scores');

// تسجيل المسارات بدون تحقق المصادقة
app.use('/contestants', contestantRoutes);
app.use('/supervisors', supervisorRoutes);
app.use('/competitions', competitionRoutes);
app.use('/scores', scoreRoutes);

// توجيه الصفحة الرئيسية إلى صفحة الدرجات
app.get('/', (req, res) => {
    res.redirect('/scores');
});

// معالجة الأخطاء 404
app.use((req, res) => {
    res.status(404).render('errors/404', {
        title: 'الصفحة غير موجودة',
        message: 'عذراً، الصفحة التي تبحث عنها غير موجودة'
    });
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', {
        title: 'خطأ في الخادم',
        message: 'عذراً، حدث خطأ في الخادم'
    });
});

// تشغيل الخادم
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`تم تشغيل الخادم على المنفذ ${PORT}`);
});
