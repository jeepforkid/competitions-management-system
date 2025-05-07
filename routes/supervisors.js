const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Supervisor, Contestant, Score, Competition } = require('../models');
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
            res.redirect('/supervisors');
        }
    };
};

// عرض قائمة المشرفات
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // بناء شروط البحث
        const whereConditions = {};
        if (search) {
            whereConditions.name = { [Op.iLike]: `%${search}%` };
        }

        // جلب المشرفات مع المتسابقات والإحصائيات
        const { rows: supervisors, count } = await Supervisor.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Contestant,
                    as: 'contestants',
                    include: [
                        {
                            model: Score,
                            as: 'scores',
                            include: [
                                {
                                    model: Competition,
                                    as: 'competition'
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['name', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // حساب الإحصائيات لكل مشرفة
        const supervisorsWithStats = await Promise.all(supervisors.map(async (supervisor) => {
            const stats = await supervisor.getStatistics();
            return {
                ...supervisor.toJSON(),
                stats
            };
        }));

        // حساب عدد الصفحات
        const totalPages = Math.ceil(count / limit);

        res.render('supervisors/list', {
            title: 'قائمة المشرفات',
            supervisors: supervisorsWithStats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                totalItems: count
            },
            search,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            },
            user: req.session.user
        });

    } catch (error) {
        console.error('خطأ في عرض قائمة المشرفات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة المشرفات');
        res.redirect('/');
    }
});

// عرض نموذج إضافة مشرفة جديدة
router.get('/new', checkPermission('admin'), (req, res) => {
    res.render('supervisors/form', {
        title: 'إضافة مشرفة جديدة',
        supervisor: {},
        messages: {
            error: req.flash('error_msg')
        }
    });
});

// إضافة مشرفة جديدة
router.post('/', checkPermission('admin'), async (req, res) => {
    try {
        const {
            name,
            hireDate,
            department,
            qualification,
            maxContestants,
            notes
        } = req.body;

        await Supervisor.create({
            name,
            hireDate,
            department,
            qualification,
            maxContestants: parseInt(maxContestants),
            notes
        });

        req.flash('success_msg', 'تم إضافة المشرفة بنجاح');
        res.redirect('/supervisors');

    } catch (error) {
        console.error('خطأ في إضافة مشرفة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء إضافة المشرفة');
        res.redirect('/supervisors/new');
    }
});

// عرض نموذج تعديل مشرفة
router.get('/:id/edit', checkPermission('admin'), async (req, res) => {
    try {
        const supervisor = await Supervisor.findByPk(req.params.id);
        if (!supervisor) {
            req.flash('error_msg', 'المشرفة غير موجودة');
            return res.redirect('/supervisors');
        }

        res.render('supervisors/form', {
            title: 'تعديل بيانات المشرفة',
            supervisor,
            messages: {
                error: req.flash('error_msg')
            }
        });

    } catch (error) {
        console.error('خطأ في عرض نموذج تعديل المشرفة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/supervisors');
    }
});

// تحديث بيانات مشرفة
router.put('/:id', checkPermission('admin'), async (req, res) => {
    try {
        const supervisor = await Supervisor.findByPk(req.params.id);
        if (!supervisor) {
            req.flash('error_msg', 'المشرفة غير موجودة');
            return res.redirect('/supervisors');
        }

        const {
            name,
            hireDate,
            department,
            qualification,
            maxContestants,
            notes,
            isActive
        } = req.body;

        // التحقق من عدد المتسابقات الحالي قبل تحديث الحد الأقصى
        const currentContestantsCount = await Contestant.count({
            where: { supervisorId: supervisor.id }
        });

        if (currentContestantsCount > parseInt(maxContestants)) {
            req.flash('error_msg', 'لا يمكن تقليل الحد الأقصى للمتسابقات لأنه يوجد متسابقات حاليات');
            return res.redirect(`/supervisors/${req.params.id}/edit`);
        }

        await supervisor.update({
            name,
            hireDate,
            department,
            qualification,
            maxContestants: parseInt(maxContestants),
            notes,
            isActive: isActive === 'true'
        });

        req.flash('success_msg', 'تم تحديث بيانات المشرفة بنجاح');
        res.redirect('/supervisors');

    } catch (error) {
        console.error('خطأ في تحديث بيانات المشرفة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحديث بيانات المشرفة');
        res.redirect(`/supervisors/${req.params.id}/edit`);
    }
});

// حذف مشرفة
router.delete('/:id', checkPermission('admin'), async (req, res) => {
    try {
        const supervisor = await Supervisor.findByPk(req.params.id);
        if (!supervisor) {
            req.flash('error_msg', 'المشرفة غير موجودة');
            return res.redirect('/supervisors');
        }

        // التحقق من عدم وجود متسابقات تحت إشراف المشرفة
        const contestantsCount = await Contestant.count({
            where: { supervisorId: supervisor.id }
        });

        if (contestantsCount > 0) {
            req.flash('error_msg', 'لا يمكن حذف المشرفة لوجود متسابقات تحت إشرافها');
            return res.redirect('/supervisors');
        }

        await supervisor.destroy();
        req.flash('success_msg', 'تم حذف المشرفة بنجاح');
        res.redirect('/supervisors');

    } catch (error) {
        console.error('خطأ في حذف المشرفة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف المشرفة');
        res.redirect('/supervisors');
    }
});

// تصدير المشرفات
router.get('/export', async (req, res) => {
    try {
        const supervisors = await Supervisor.findAll({
            include: [
                {
                    model: Contestant,
                    as: 'contestants',
                    include: [
                        {
                            model: Score,
                            as: 'scores',
                            include: [
                                {
                                    model: Competition,
                                    as: 'competition'
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['name', 'ASC']]
        });

        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('المشرفات');

        // إضافة رأس الجدول
        worksheet.columns = [
            { header: 'الاسم', key: 'name', width: 30 },
            { header: 'تاريخ التعيين', key: 'hireDate', width: 15 },
            { header: 'القسم', key: 'department', width: 20 },
            { header: 'المؤهل العلمي', key: 'qualification', width: 30 },
            { header: 'الرقم الوظيفي', key: 'employeeId', width: 15 },
            { header: 'عدد المتسابقات', key: 'contestantsCount', width: 15 },
            { header: 'متوسط الدرجات', key: 'averageScore', width: 15 },
            { header: 'الحالة', key: 'status', width: 10 }
        ];

        // إضافة البيانات
        for (const supervisor of supervisors) {
            const stats = await supervisor.getStatistics();
            worksheet.addRow({
                name: supervisor.name,
                hireDate: supervisor.hireDate,
                department: supervisor.department,
                qualification: supervisor.qualification,
                employeeId: supervisor.employeeId,
                contestantsCount: stats.contestantsCount,
                averageScore: stats.averageScore,
                status: supervisor.isActive ? 'نشط' : 'غير نشط'
            });
        }

        // تنسيق الجدول
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // إرسال الملف
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=supervisors.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('خطأ في تصدير المشرفات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تصدير المشرفات');
        res.redirect('/supervisors');
    }
});

// استيراد المشرفات
router.post('/import', checkPermission('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'يرجى اختيار ملف للاستيراد');
            return res.redirect('/supervisors');
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet(1);

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // قراءة البيانات من الملف
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            try {
                const [name, hireDate, department, qualification, maxContestants] = row.values;

                await Supervisor.create({
                    name,
                    hireDate: new Date(hireDate),
                    department,
                    qualification,
                    maxContestants: parseInt(maxContestants) || 10
                });

                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`صف ${rowNumber}: ${error.message}`);
            }
        }

        req.flash('success_msg', `تم استيراد ${successCount} مشرفة بنجاح. ${errorCount} حالات فشل.`);
        if (errors.length > 0) {
            req.flash('error_msg', errors.join('\n'));
        }

        res.redirect('/supervisors');

    } catch (error) {
        console.error('خطأ في استيراد المشرفات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء استيراد المشرفات');
        res.redirect('/supervisors');
    }
});

module.exports = router;
