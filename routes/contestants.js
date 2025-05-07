const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Contestant, Supervisor, Score, Competition } = require('../models');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم'));
        }
    }
});

// التحقق من الصلاحيات
const checkPermission = (requiredRole) => {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role >= requiredRole) {
            next();
        } else {
            req.flash('error_msg', 'ليس لديك صلاحية للقيام بهذا الإجراء');
            res.redirect('/contestants');
        }
    };
};

// عرض قائمة المتسابقات
router.get('/', async (req, res) => {
    try {
        const { search, supervisorId, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // بناء شروط البحث
        const whereConditions = {};
        if (search) {
            whereConditions.name = { [Op.iLike]: `%${search}%` };
        }
        if (supervisorId) {
            whereConditions.supervisorId = supervisorId;
        }

        // جلب المتسابقات مع المشرفات والدرجات
        const { rows: contestants, count } = await Contestant.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Supervisor,
                    as: 'supervisor',
                    attributes: ['id', 'name']
                },
                {
                    model: Score,
                    as: 'scores',
                    include: [
                        {
                            model: Competition,
                            as: 'competition',
                            attributes: ['id', 'title']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // جلب قائمة المشرفات للفلتر
        const supervisors = await Supervisor.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        // حساب عدد الصفحات
        const totalPages = Math.ceil(count / limit);

        res.render('contestants/list', {
            title: 'قائمة المتسابقات',
            contestants,
            supervisors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                totalItems: count
            },
            search,
            supervisorId,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            },
            user: req.session.user
        });

    } catch (error) {
        console.error('خطأ في عرض قائمة المتسابقات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة المتسابقات');
        res.redirect('/');
    }
});

// عرض نموذج إضافة متسابقة جديدة
router.get('/new', checkPermission('editor'), async (req, res) => {
    try {
        const supervisors = await Supervisor.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });

        res.render('contestants/form', {
            title: 'إضافة متسابقة جديدة',
            contestant: {},
            supervisors,
            messages: {
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('خطأ في عرض نموذج إضافة متسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/contestants');
    }
});

// إضافة متسابقة جديدة
router.post('/', checkPermission('editor'), async (req, res) => {
    try {
        const {
            name,
            birthDate,
            educationLevel,
            address,
            supervisorId,
            notes
        } = req.body;

        // التحقق من إمكانية إضافة متسابقة للمشرفة
        if (supervisorId) {
            const supervisor = await Supervisor.findByPk(supervisorId);
            const canAdd = await supervisor.canAddContestant();
            if (!canAdd) {
                req.flash('error_msg', 'المشرفة وصلت للحد الأقصى من المتسابقات');
                return res.redirect('/contestants/new');
            }
        }

        // إنشاء المتسابقة
        await Contestant.create({
            name,
            birthDate,
            educationLevel,
            address,
            supervisorId,
            notes
        });

        req.flash('success_msg', 'تم إضافة المتسابقة بنجاح');
        res.redirect('/contestants');

    } catch (error) {
        console.error('خطأ في إضافة متسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء إضافة المتسابقة');
        res.redirect('/contestants/new');
    }
});

// عرض نموذج تعديل متسابقة
router.get('/:id/edit', checkPermission('editor'), async (req, res) => {
    try {
        const contestant = await Contestant.findByPk(req.params.id);
        if (!contestant) {
            req.flash('error_msg', 'المتسابقة غير موجودة');
            return res.redirect('/contestants');
        }

        const supervisors = await Supervisor.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });

        res.render('contestants/form', {
            title: 'تعديل بيانات المتسابقة',
            contestant,
            supervisors,
            messages: {
                error: req.flash('error_msg')
            }
        });

    } catch (error) {
        console.error('خطأ في عرض نموذج تعديل المتسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/contestants');
    }
});

// تحديث بيانات متسابقة
router.put('/:id', checkPermission('editor'), async (req, res) => {
    try {
        const contestant = await Contestant.findByPk(req.params.id);
        if (!contestant) {
            req.flash('error_msg', 'المتسابقة غير موجودة');
            return res.redirect('/contestants');
        }

        const {
            name,
            birthDate,
            educationLevel,
            address,
            supervisorId,
            notes
        } = req.body;

        // التحقق من إمكانية نقل المتسابقة لمشرفة جديدة
        if (supervisorId && supervisorId !== contestant.supervisorId) {
            const supervisor = await Supervisor.findByPk(supervisorId);
            const canAdd = await supervisor.canAddContestant();
            if (!canAdd) {
                req.flash('error_msg', 'المشرفة الجديدة وصلت للحد الأقصى من المتسابقات');
                return res.redirect(`/contestants/${req.params.id}/edit`);
            }
        }

        // تحديث بيانات المتسابقة
        await contestant.update({
            name,
            birthDate,
            educationLevel,
            address,
            supervisorId,
            notes
        });

        req.flash('success_msg', 'تم تحديث بيانات المتسابقة بنجاح');
        res.redirect('/contestants');

    } catch (error) {
        console.error('خطأ في تحديث بيانات المتسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحديث بيانات المتسابقة');
        res.redirect(`/contestants/${req.params.id}/edit`);
    }
});

// حذف متسابقة
router.delete('/:id', checkPermission('admin'), async (req, res) => {
    try {
        const contestant = await Contestant.findByPk(req.params.id);
        if (!contestant) {
            req.flash('error_msg', 'المتسابقة غير موجودة');
            return res.redirect('/contestants');
        }

        await contestant.destroy();
        req.flash('success_msg', 'تم حذف المتسابقة بنجاح');
        res.redirect('/contestants');

    } catch (error) {
        console.error('خطأ في حذف المتسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف المتسابقة');
        res.redirect('/contestants');
    }
});

// تصدير المتسابقات المحددة
router.post('/export', async (req, res) => {
    try {
        const { contestantIds } = req.body;
        
        // التحقق من وجود متسابقات محددة
        if (!contestantIds || contestantIds.length === 0) {
            req.flash('error_msg', 'يرجى تحديد المتسابقات المراد تصديرها');
            return res.redirect('/contestants');
        }

        // جلب بيانات المتسابقات المحددة
        const contestants = await Contestant.findAll({
            where: {
                id: contestantIds
            },
            include: [
                {
                    model: Supervisor,
                    as: 'supervisor',
                    attributes: ['name']
                },
                {
                    model: Score,
                    as: 'scores',
                    include: [
                        {
                            model: Competition,
                            as: 'competition',
                            attributes: ['title']
                        }
                    ]
                }
            ]
        });

        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('المتسابقات');

        // إضافة رأس الجدول
        worksheet.columns = [
            { header: 'الاسم', key: 'name', width: 30 },
            { header: 'تاريخ الميلاد', key: 'birthDate', width: 15 },
            { header: 'المستوى التعليمي', key: 'educationLevel', width: 20 },
            { header: 'العنوان', key: 'address', width: 30 },
            { header: 'المشرفة', key: 'supervisor', width: 30 },
            { header: 'رقم التسجيل', key: 'registrationNumber', width: 15 },
            { header: 'تاريخ التسجيل', key: 'createdAt', width: 20 }
        ];

        // إضافة البيانات
        contestants.forEach(contestant => {
            worksheet.addRow({
                name: contestant.name,
                birthDate: contestant.birthDate,
                educationLevel: contestant.educationLevel,
                address: contestant.address,
                supervisor: contestant.supervisor ? contestant.supervisor.name : '',
                registrationNumber: contestant.registrationNumber,
                createdAt: contestant.createdAt.toLocaleDateString('ar-SA')
            });
        });

        // تنسيق الجدول
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // إرسال الملف
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=contestants.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('خطأ في تصدير المتسابقات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تصدير المتسابقات');
        res.redirect('/contestants');
    }
});

// استيراد المتسابقات
router.post('/import', checkPermission('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'يرجى اختيار ملف للاستيراد');
            return res.redirect('/contestants');
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // قراءة البيانات من الملف
        worksheet.eachRow({ includeEmpty: false, skipHeader: true }, async (row, rowNumber) => {
            if (rowNumber === 1) return; // تخطي صف العناوين

            try {
                const [name, birthDate, educationLevel, address, supervisorName] = row.values;

                // البحث عن المشرفة
                let supervisor = null;
                if (supervisorName) {
                    supervisor = await Supervisor.findOne({
                        where: { name: supervisorName }
                    });
                }

                // إنشاء المتسابقة
                await Contestant.create({
                    name,
                    birthDate: new Date(birthDate),
                    educationLevel,
                    address,
                    supervisorId: supervisor ? supervisor.id : null
                });

                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`صف ${rowNumber}: ${error.message}`);
            }
        });

        req.flash('success_msg', `تم استيراد ${successCount} متسابقة بنجاح. ${errorCount} حالات فشل.`);
        if (errors.length > 0) {
            req.flash('error_msg', errors.join('\n'));
        }

        res.redirect('/contestants');

    } catch (error) {
        console.error('خطأ في استيراد المتسابقات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء استيراد المتسابقات');
        res.redirect('/contestants');
    }
});

module.exports = router;
