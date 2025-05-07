const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Score, Contestant, Competition, Supervisor } = require('../models');
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
            res.redirect('/scores');
        }
    };
};

// الصفحة الرئيسية (صفحة الدرجات)
router.get('/', async (req, res) => {
    try {
        const { search, competitionId, supervisorId, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // بناء شروط البحث
        const whereConditions = {};
        const contestantWhere = {};
        const competitionWhere = {};
        const supervisorWhere = {};

        if (search) {
            contestantWhere.name = { [Op.iLike]: `%${search}%` };
        }
        if (competitionId) {
            whereConditions.competitionId = competitionId;
        }
        if (supervisorId) {
            whereConditions.supervisorId = supervisorId;
        }

        // جلب الدرجات مع العلاقات
        const { rows: scores, count } = await Score.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Contestant,
                    as: 'contestant',
                    where: contestantWhere,
                    required: true
                },
                {
                    model: Competition,
                    as: 'competition',
                    where: competitionWhere,
                    required: true
                },
                {
                    model: Supervisor,
                    as: 'supervisor',
                    where: supervisorWhere,
                    required: true
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // جلب قوائم التصفية
        const competitions = await Competition.findAll({
            order: [['title', 'ASC']]
        });

        const supervisors = await Supervisor.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });

        // حساب عدد الصفحات
        const totalPages = Math.ceil(count / limit);

        res.render('scores/list', {
            title: 'الدرجات',
            scores,
            competitions,
            supervisors,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                totalItems: count
            },
            search,
            competitionId,
            supervisorId,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            },
            user: req.session.user
        });

    } catch (error) {
        console.error('خطأ في عرض قائمة الدرجات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة الدرجات');
        res.redirect('/');
    }
});

// عرض نموذج إدخال الدرجات
router.get('/new', checkPermission('editor'), async (req, res) => {
    try {
        // جلب المسابقات النشطة
        const competitions = await Competition.findAll({
            where: {
                status: 'جارية'
            },
            order: [['title', 'ASC']]
        });

        // جلب المشرفات النشطات
        const supervisors = await Supervisor.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });

        res.render('scores/form', {
            title: 'إدخال درجات جديدة',
            competitions,
            supervisors,
            messages: {
                error: req.flash('error_msg')
            }
        });

    } catch (error) {
        console.error('خطأ في عرض نموذج إدخال الدرجات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/scores');
    }
});

// البحث عن المتسابقات (للبحث الذكي)
router.get('/search-contestants', async (req, res) => {
    try {
        const { term, supervisorId } = req.query;
        
        // بناء شروط البحث
        const whereConditions = {
            name: { [Op.iLike]: `%${term}%` }
        };
        
        if (supervisorId) {
            whereConditions.supervisorId = supervisorId;
        }

        // البحث عن المتسابقات
        const contestants = await Contestant.findAll({
            where: whereConditions,
            include: [
                {
                    model: Supervisor,
                    as: 'supervisor'
                }
            ],
            limit: 10
        });

        res.json(contestants);

    } catch (error) {
        console.error('خطأ في البحث عن المتسابقات:', error);
        res.status(500).json({ error: 'حدث خطأ في البحث' });
    }
});

// إضافة درجات جديدة
router.post('/', checkPermission('editor'), async (req, res) => {
    try {
        const {
            competitionId,
            contestantId,
            supervisorId,
            scoreValue,
            notes
        } = req.body;

        // التحقق من وجود المسابقة والمتسابقة والمشرفة
        const [competition, contestant, supervisor] = await Promise.all([
            Competition.findByPk(competitionId),
            Contestant.findByPk(contestantId),
            Supervisor.findByPk(supervisorId)
        ]);

        if (!competition || !contestant || !supervisor) {
            req.flash('error_msg', 'بيانات غير صحيحة');
            return res.redirect('/scores/new');
        }

        // التحقق من أن المسابقة جارية
        if (competition.status !== 'جارية') {
            req.flash('error_msg', 'لا يمكن إدخال درجات لمسابقة غير جارية');
            return res.redirect('/scores/new');
        }

        // التحقق من عدم وجود درجة مسجلة مسبقاً
        const existingScore = await Score.findOne({
            where: {
                competitionId,
                contestantId
            }
        });

        if (existingScore) {
            req.flash('error_msg', 'تم تسجيل درجة لهذه المتسابقة في هذه المسابقة مسبقاً');
            return res.redirect('/scores/new');
        }

        // إنشاء الدرجة
        await Score.create({
            competitionId,
            contestantId,
            supervisorId,
            scoreValue: parseFloat(scoreValue),
            notes
        });

        req.flash('success_msg', 'تم إضافة الدرجة بنجاح');
        res.redirect('/scores');

    } catch (error) {
        console.error('خطأ في إضافة درجة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء إضافة الدرجة');
        res.redirect('/scores/new');
    }
});

// تعديل درجة
router.put('/:id', checkPermission('editor'), async (req, res) => {
    try {
        const score = await Score.findByPk(req.params.id);
        if (!score) {
            return res.status(404).json({ error: 'الدرجة غير موجودة' });
        }

        const { scoreValue, notes } = req.body;

        // التحقق من أن المسابقة ما زالت جارية
        const competition = await Competition.findByPk(score.competitionId);
        if (competition.status !== 'جارية') {
            return res.status(400).json({ error: 'لا يمكن تعديل درجات مسابقة منتهية' });
        }

        await score.update({
            scoreValue: parseFloat(scoreValue),
            notes
        });

        res.json({ message: 'تم تحديث الدرجة بنجاح' });

    } catch (error) {
        console.error('خطأ في تعديل الدرجة:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تعديل الدرجة' });
    }
});

// حذف درجة
router.delete('/:id', checkPermission('admin'), async (req, res) => {
    try {
        const score = await Score.findByPk(req.params.id);
        if (!score) {
            req.flash('error_msg', 'الدرجة غير موجودة');
            return res.redirect('/scores');
        }

        await score.destroy();
        req.flash('success_msg', 'تم حذف الدرجة بنجاح');
        res.redirect('/scores');

    } catch (error) {
        console.error('خطأ في حذف الدرجة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف الدرجة');
        res.redirect('/scores');
    }
});

// تصدير الدرجات
router.get('/export', async (req, res) => {
    try {
        const { competitionId, supervisorId } = req.query;

        // بناء شروط البحث
        const whereConditions = {};
        if (competitionId) {
            whereConditions.competitionId = competitionId;
        }
        if (supervisorId) {
            whereConditions.supervisorId = supervisorId;
        }

        // جلب الدرجات
        const scores = await Score.findAll({
            where: whereConditions,
            include: [
                {
                    model: Contestant,
                    as: 'contestant'
                },
                {
                    model: Competition,
                    as: 'competition'
                },
                {
                    model: Supervisor,
                    as: 'supervisor'
                }
            ],
            order: [
                ['competitionId', 'ASC'],
                ['contestantId', 'ASC']
            ]
        });

        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('الدرجات');

        // إضافة رأس الجدول
        worksheet.columns = [
            { header: 'المسابقة', key: 'competition', width: 30 },
            { header: 'المتسابقة', key: 'contestant', width: 30 },
            { header: 'المشرفة', key: 'supervisor', width: 30 },
            { header: 'الدرجة', key: 'score', width: 15 },
            { header: 'النتيجة', key: 'result', width: 15 },
            { header: 'تاريخ التسجيل', key: 'entryDate', width: 20 },
            { header: 'ملاحظات', key: 'notes', width: 30 }
        ];

        // إضافة البيانات
        scores.forEach(score => {
            worksheet.addRow({
                competition: score.competition.title,
                contestant: score.contestant.name,
                supervisor: score.supervisor.name,
                score: score.scoreValue,
                result: score.scoreValue >= score.competition.passingScore ? 'ناجحة' : 'غير ناجحة',
                entryDate: score.createdAt.toLocaleDateString('ar-SA'),
                notes: score.notes
            });
        });

        // تنسيق الجدول
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // إرسال الملف
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=scores.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('خطأ في تصدير الدرجات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تصدير الدرجات');
        res.redirect('/scores');
    }
});

// استيراد الدرجات
router.post('/import', checkPermission('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'يرجى اختيار ملف للاستيراد');
            return res.redirect('/scores');
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
                const [competitionTitle, contestantName, supervisorName, scoreValue] = row.values;

                // البحث عن المسابقة والمتسابقة والمشرفة
                const competition = await Competition.findOne({
                    where: { title: competitionTitle }
                });

                const contestant = await Contestant.findOne({
                    where: { name: contestantName }
                });

                const supervisor = await Supervisor.findOne({
                    where: { name: supervisorName }
                });

                if (!competition || !contestant || !supervisor) {
                    throw new Error('بيانات غير صحيحة');
                }

                // التحقق من عدم وجود درجة مسجلة مسبقاً
                const existingScore = await Score.findOne({
                    where: {
                        competitionId: competition.id,
                        contestantId: contestant.id
                    }
                });

                if (existingScore) {
                    throw new Error('الدرجة مسجلة مسبقاً');
                }

                // إنشاء الدرجة
                await Score.create({
                    competitionId: competition.id,
                    contestantId: contestant.id,
                    supervisorId: supervisor.id,
                    scoreValue: parseFloat(scoreValue)
                });

                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`صف ${rowNumber}: ${error.message}`);
            }
        }

        req.flash('success_msg', `تم استيراد ${successCount} درجة بنجاح. ${errorCount} حالات فشل.`);
        if (errors.length > 0) {
            req.flash('error_msg', errors.join('\n'));
        }

        res.redirect('/scores');

    } catch (error) {
        console.error('خطأ في استيراد الدرجات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء استيراد الدرجات');
        res.redirect('/scores');
    }
});

module.exports = router;
