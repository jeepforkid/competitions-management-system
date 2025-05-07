const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');

// وسيط للتحقق من عدم تسجيل الدخول
const ensureNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    res.redirect('/scores'); // إعادة التوجيه إلى الصفحة الرئيسية إذا كان المستخدم مسجل الدخول
};

// وسيط للتحقق من تسجيل الدخول
const ensureAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة');
    res.redirect('/auth/login');
};

// عرض صفحة تسجيل الدخول
router.get('/login', ensureNotAuthenticated, (req, res) => {
    res.render('auth/login', {
        title: 'تسجيل الدخول',
        messages: {
            error: req.flash('error_msg'),
            success: req.flash('success_msg')
        }
    });
});

// معالجة تسجيل الدخول
router.post('/login', ensureNotAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;

        // التحقق من وجود اسم المستخدم وكلمة المرور
        if (!username || !password) {
            req.flash('error_msg', 'يرجى إدخال اسم المستخدم وكلمة المرور');
            return res.redirect('/auth/login');
        }

        // البحث عن المستخدم
        const user = await User.findOne({ where: { username } });
        
        if (!user) {
            req.flash('error_msg', 'اسم المستخدم غير موجود');
            return res.redirect('/auth/login');
        }

        // التحقق من كلمة المرور
        const isValidPassword = await user.verifyPassword(password);
        
        if (!isValidPassword) {
            req.flash('error_msg', 'كلمة المرور غير صحيحة');
            return res.redirect('/auth/login');
        }

        // التحقق من حالة المستخدم
        if (!user.isActive) {
            req.flash('error_msg', 'هذا الحساب غير نشط. يرجى التواصل مع المسؤول');
            return res.redirect('/auth/login');
        }

        // تحديث آخر تسجيل دخول
        await user.update({ lastLogin: new Date() });

        // حفظ بيانات المستخدم في الجلسة
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role
        };

        // إعادة التوجيه إلى الصفحة الرئيسية
        res.redirect('/scores');

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تسجيل الدخول');
        res.redirect('/auth/login');
    }
});

// تسجيل الخروج
router.get('/logout', ensureAuthenticated, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('خطأ في تسجيل الخروج:', err);
            return res.redirect('/');
        }
        res.redirect('/auth/login');
    });
});

// تغيير كلمة المرور
router.get('/change-password', ensureAuthenticated, (req, res) => {
    res.render('auth/change-password', {
        title: 'تغيير كلمة المرور',
        messages: {
            error: req.flash('error_msg'),
            success: req.flash('success_msg')
        }
    });
});

router.post('/change-password', ensureAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user.id;

        // التحقق من تطابق كلمة المرور الجديدة
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'كلمة المرور الجديدة غير متطابقة');
            return res.redirect('/auth/change-password');
        }

        // البحث عن المستخدم
        const user = await User.findByPk(userId);
        
        // التحقق من كلمة المرور الحالية
        const isValidPassword = await user.verifyPassword(currentPassword);
        
        if (!isValidPassword) {
            req.flash('error_msg', 'كلمة المرور الحالية غير صحيحة');
            return res.redirect('/auth/change-password');
        }

        // تحديث كلمة المرور
        user.password = newPassword;
        await user.save();

        req.flash('success_msg', 'تم تغيير كلمة المرور بنجاح');
        res.redirect('/scores');

    } catch (error) {
        console.error('خطأ في تغيير كلمة المرور:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تغيير كلمة المرور');
        res.redirect('/auth/change-password');
    }
});

// تصدير المسارات
module.exports = router;
