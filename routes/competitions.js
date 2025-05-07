const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Competition, Score, Contestant, Supervisor } = require('../models');
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
            res.redirect('/competitions');
        }
    };
};

// عرض قائمة المسابقات
router.get('/', async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // بناء شروط البحث
        const whereConditions = {};
        if (search) {
            whereConditions.title = { [Op.iLike]: `%${search}%` };
        }
        if (status) {
            whereConditions.status = status;
        }

        // جلب المسابقات مع الإحصائيات
        const { rows: competitions, count } = await Competition.findAndCountAll({
            where: whereConditions,
            include: [
                {
                    model: Score,
                    as: 'scores',
                    include: [
                        {
                            model: Contestant,
                            as: 'contestant'
                        }
                    ]
                }
            ],
            order: [['startDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // حساب الإحصائيات لكل مسابقة
        const competitionsWithStats = await Promise.all(competitions.map(async (competition) => {
            const stats = await competition.getStatistics();
            return {
                ...competition.toJSON(),
                stats
            };
        }));

        // حساب عدد الصفحات
        const totalPages = Math.ceil(count / limit);

        res.render('competitions/list', {
            title: 'قائمة المسابقات',
            competitions: competitionsWithStats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                totalItems: count
            },
            search,
            status,
            statusOptions: ['قادمة', 'جارية', 'منتهية'],
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            },
            user: req.session.user
        });

    } catch (error) {
        console.error('خطأ في عرض قائمة المسابقات:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل قائمة المسابقات');
        res.redirect('/');
    }
});

// عرض نموذج إضافة مسابقة جديدة
router.get('/new', checkPermission('editor'), async (req, res) => {
    try {
        // جلب قائمة المتسابقات والمشرفات للاختيار
        const contestants = await Contestant.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Supervisor,
                    as: 'supervisor'
                }
            ],
            order: [['name', 'ASC']]
        });

        res.render('competitions/form', {
            title: 'إضافة مسابقة جديدة',
            competition: {},
            contestants,
            messages: {
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('خطأ في عرض نموذج إضافة مسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/competitions');
    }
});

// إضافة مسابقة جديدة
router.post('/', checkPermission('editor'), async (req, res) => {
    try {
        const {
            title,
            description,
            startDate,
            endDate,
            maxScore,
            passingScore,
            maxContestants,
            notes,
            contestants
        } = req.body;

        // إنشاء المسابقة
        const competition = await Competition.create({
            title,
            description,
            startDate,
            endDate,
            maxScore: parseFloat(maxScore),
            passingScore: parseFloat(passingScore),
            maxContestants: parseInt(maxContestants),
            notes
        });

        // إضافة المتسابقات إذا تم تحديدهم
        if (contestants && Array.isArray(contestants)) {
            const scores = contestants.map(contestantId => ({
                competitionId: competition.id,
                contestantId: parseInt(contestantId),
                scoreValue: 0, // قيمة أولية
                supervisorId: req.session.user.id // المستخدم الحالي كمشرف
            }));

            await Score.bulkCreate(scores);
        }

        req.flash('success_msg', 'تم إضافة المسابقة بنجاح');
        res.redirect('/competitions');

    } catch (error) {
        console.error('خطأ في إضافة مسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء إضافة المسابقة');
        res.redirect('/competitions/new');
    }
});

// عرض نموذج تعديل مسابقة
router.get('/:id/edit', checkPermission('editor'), async (req, res) => {
    try {
        const competition = await Competition.findByPk(req.params.id, {
            include: [
                {
                    model: Score,
                    as: 'scores',
                    include: [
                        {
                            model: Contestant,
                            as: 'contestant'
                        }
                    ]
                }
            ]
        });

        if (!competition) {
            req.flash('error_msg', 'المسابقة غير موجودة');
            return res.redirect('/competitions');
        }

        // جلب قائمة المتسابقات
        const contestants = await Contestant.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Supervisor,
                    as: 'supervisor'
                }
            ],
            order: [['name', 'ASC']]
        });

        res.render('competitions/form', {
            title: 'تعديل بيانات المسابقة',
            competition,
            contestants,
            messages: {
                error: req.flash('error_msg')
            }
        });

    } catch (error) {
        console.error('خطأ في عرض نموذج تعديل المسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/competitions');
    }
});

// تحديث بيانات مسابقة
router.put('/:id', checkPermission('editor'), async (req, res) => {
    try {
        const competition = await Competition.findByPk(req.params.id);
        if (!competition) {
            req.flash('error_msg', 'المسابقة غير موجودة');
            return res.redirect('/competitions');
        }

        const {
            title,
            description,
            startDate,
            endDate,
            maxScore,
            passingScore,
            maxContestants,
            notes,
            contestants
        } = req.body;

        // تحديث بيانات المسابقة
        await competition.update({
            title,
            description,
            startDate,
            endDate,
            maxScore: parseFloat(maxScore),
            passingScore: parseFloat(passingScore),
            maxContestants: parseInt(maxContestants),
            notes
        });

        // تحديث المتسابقات
        if (contestants && Array.isArray(contestants)) {
            // حذف المتسابقات الحاليين
            await Score.destroy({
                where: { competitionId: competition.id }
            });

            // إضافة المتسابقات الجدد
            const scores = contestants.map(contestantId => ({
                competitionId: competition.id,
                contestantId: parseInt(contestantId),
                scoreValue: 0,
                supervisorId: req.session.user.id
            }));

            await Score.bulkCreate(scores);
        }

        req.flash('success_msg', 'تم تحديث بيانات المسابقة بنجاح');
        res.redirect('/competitions');

    } catch (error) {
        console.error('خطأ في تحديث بيانات المسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحديث بيانات المسابقة');
        res.redirect(`/competitions/${req.params.id}/edit`);
    }
});

// حذف مسابقة
router.delete('/:id', checkPermission('admin'), async (req, res) => {
    try {
        const competition = await Competition.findByPk(req.params.id);
        if (!competition) {
            req.flash('error_msg', 'المسابقة غير موجودة');
            return res.redirect('/competitions');
        }

        // التحقق من وجود درجات مسجلة
        const scoresCount = await Score.count({
            where: { competitionId: competition.id }
        });

        if (scoresCount > 0) {
            req.flash('error_msg', 'لا يمكن حذف المسابقة لوجود درجات مسجلة');
            return res.redirect('/competitions');
        }

        await competition.destroy();
        req.flash('success_msg', 'تم حذف المسابقة بنجاح');
        res.redirect('/competitions');

    } catch (error) {
        console.error('خطأ في حذف المسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف المسابقة');
        res.redirect('/competitions');
    }
});

// إضافة درجات للمتسابقات
router.post('/:id/scores', checkPermission('editor'), async (req, res) => {
    try {
        const { scores } = req.body;
        const competitionId = req.params.id;

        // التحقق من وجود المسابقة
        const competition = await Competition.findByPk(competitionId);
        if (!competition) {
            return res.status(404).json({ error: 'المسابقة غير موجودة' });
        }

        // تحديث الدرجات
        for (const score of scores) {
            await Score.update(
                { scoreValue: parseFloat(score.value) },
                {
                    where: {
                        competitionId,
                        contestantId: score.contestantId
                    }
                }
            );
        }

        res.json({ message: 'تم تحديث الدرجات بنجاح' });

    } catch (error) {
        console.error('خطأ في تحديث الدرجات:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الدرجات' });
    }
});

// تصدير نتائج المسابقة
router.get('/:id/export', async (req, res) => {
    try {
        const competition = await Competition.findByPk(req.params.id, {
            include: [
                {
                    model: Score,
                    as: 'scores',
                    include: [
                        {
                            model: Contestant,
                            as: 'contestant',
                            include: [
                                {
                                    model: Supervisor,
                                    as: 'supervisor'
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        if (!competition) {
            req.flash('error_msg', 'المسابقة غير موجودة');
            return res.redirect('/competitions');
        }

        // إنشاء ملف Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('نتائج المسابقة');

        // إضافة رأس الجدول
        worksheet.columns = [
            { header: 'اسم المتسابقة', key: 'contestantName', width: 30 },
            { header: 'المشرفة', key: 'supervisorName', width: 30 },
            { header: 'الدرجة', key: 'score', width: 15 },
            { header: 'النتيجة', key: 'result', width: 15 },
            { header: 'تاريخ التسجيل', key: 'entryDate', width: 20 }
        ];

        // إضافة البيانات
        competition.scores.forEach(score => {
            worksheet.addRow({
                contestantName: score.contestant.name,
                supervisorName: score.contestant.supervisor ? score.contestant.supervisor.name : '',
                score: score.scoreValue,
                result: score.scoreValue >= competition.passingScore ? 'ناجحة' : 'غير ناجحة',
                entryDate: score.createdAt.toLocaleDateString('ar-SA')
            });
        });

        // تنسيق الجدول
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // إضافة معلومات المسابقة
        worksheet.addRow([]);
        worksheet.addRow(['معلومات المسابقة']);
        worksheet.addRow(['العنوان', competition.title]);
        worksheet.addRow(['تاريخ البداية', competition.startDate.toLocaleDateString('ar-SA')]);
        worksheet.addRow(['تاريخ النهاية', competition.endDate.toLocaleDateString('ar-SA')]);
        worksheet.addRow(['الدرجة القصوى', competition.maxScore]);
        worksheet.addRow(['درجة النجاح', competition.passingScore]);

        // إرسال الملف
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=competition-${competition.id}-results.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('خطأ في تصدير نتائج المسابقة:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تصدير النتائج');
        res.redirect('/competitions');
    }
});

module.exports = router;
