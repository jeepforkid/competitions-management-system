// نموذج المشرفة
module.exports = (sequelize, DataTypes) => {
    const Supervisor = sequelize.define('Supervisor', {
        // معرف المشرفة
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // اسم المشرفة
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال اسم المشرفة'
                },
                len: {
                    args: [2, 100],
                    msg: 'يجب أن يكون اسم المشرفة بين 2 و 100 حرف'
                }
            }
        },

        // تاريخ التعيين
        hireDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال تاريخ التعيين'
                },
                isDate: {
                    msg: 'يجب إدخال تاريخ صحيح'
                },
                // التحقق من أن تاريخ التعيين لا يتجاوز التاريخ الحالي
                isNotFuture(value) {
                    if (new Date(value) > new Date()) {
                        throw new Error('لا يمكن أن يكون تاريخ التعيين في المستقبل');
                    }
                }
            }
        },

        // القسم/المجال
        department: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال القسم'
                }
            }
        },

        // المؤهل العلمي
        qualification: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال المؤهل العلمي'
                }
            }
        },

        // الرقم الوظيفي
        employeeId: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال الرقم الوظيفي'
                }
            }
        },

        // حالة المشرفة (نشطة/غير نشطة)
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        // الحد الأقصى لعدد المتسابقات
        maxContestants: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
            validate: {
                min: {
                    args: [1],
                    msg: 'يجب أن يكون الحد الأدنى للمتسابقات 1'
                },
                max: {
                    args: [50],
                    msg: 'الحد الأقصى للمتسابقات هو 50'
                }
            }
        },

        // ملاحظات
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        // خيارات النموذج
        timestamps: true, // إضافة حقول createdAt و updatedAt
        paranoid: true,  // الحذف الناعم (soft delete)

        // الدوال المساعدة
        hooks: {
            // توليد رقم وظيفي فريد قبل الإنشاء
            beforeCreate: async (supervisor) => {
                if (!supervisor.employeeId) {
                    const year = new Date().getFullYear();
                    const count = await sequelize.models.Supervisor.count();
                    supervisor.employeeId = `SUP-${year}-${(count + 1).toString().padStart(3, '0')}`;
                }
            }
        }
    });

    // دوال إضافية للنموذج

    // التحقق من إمكانية إضافة متسابقة جديدة
    Supervisor.prototype.canAddContestant = async function() {
        const currentContestantsCount = await sequelize.models.Contestant.count({
            where: { supervisorId: this.id }
        });
        return currentContestantsCount < this.maxContestants;
    };

    // حساب متوسط درجات جميع المتسابقات تحت إشراف المشرفة
    Supervisor.prototype.calculateAverageScores = async function() {
        const contestants = await this.getContestants({
            include: [{
                model: sequelize.models.Score,
                as: 'scores'
            }]
        });

        if (contestants.length === 0) return 0;

        let totalScore = 0;
        let totalScores = 0;

        contestants.forEach(contestant => {
            contestant.scores.forEach(score => {
                totalScore += score.scoreValue;
                totalScores++;
            });
        });

        return totalScores > 0 ? (totalScore / totalScores).toFixed(2) : 0;
    };

    // الحصول على إحصائيات المشرفة
    Supervisor.prototype.getStatistics = async function() {
        const contestantsCount = await sequelize.models.Contestant.count({
            where: { supervisorId: this.id }
        });

        const scoresCount = await sequelize.models.Score.count({
            include: [{
                model: sequelize.models.Contestant,
                as: 'contestant',
                where: { supervisorId: this.id }
            }]
        });

        const averageScore = await this.calculateAverageScores();

        return {
            contestantsCount,
            scoresCount,
            averageScore,
            availableSlots: this.maxContestants - contestantsCount
        };
    };

    return Supervisor;
};
