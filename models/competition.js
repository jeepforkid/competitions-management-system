// نموذج المسابقة
module.exports = (sequelize, DataTypes) => {
    const Competition = sequelize.define('Competition', {
        // معرف المسابقة
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // عنوان المسابقة
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال عنوان المسابقة'
                },
                len: {
                    args: [3, 150],
                    msg: 'يجب أن يكون عنوان المسابقة بين 3 و 150 حرف'
                }
            }
        },

        // وصف المسابقة
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 1000],
                    msg: 'يجب أن لا يتجاوز وصف المسابقة 1000 حرف'
                }
            }
        },

        // تاريخ بداية المسابقة
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال تاريخ بداية المسابقة'
                },
                isDate: {
                    msg: 'يجب إدخال تاريخ صحيح'
                }
            }
        },

        // تاريخ نهاية المسابقة
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال تاريخ نهاية المسابقة'
                },
                isDate: {
                    msg: 'يجب إدخال تاريخ صحيح'
                },
                // التحقق من أن تاريخ النهاية بعد تاريخ البداية
                isAfterStartDate(value) {
                    if (new Date(value) <= new Date(this.startDate)) {
                        throw new Error('يجب أن يكون تاريخ النهاية بعد تاريخ البداية');
                    }
                }
            }
        },

        // الدرجة القصوى
        maxScore: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 100.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'يجب أن تكون الدرجة القصوى أكبر من أو تساوي 0'
                },
                max: {
                    args: [100],
                    msg: 'يجب أن تكون الدرجة القصوى أقل من أو تساوي 100'
                }
            }
        },

        // الدرجة الدنيا للنجاح
        passingScore: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 50.00,
            validate: {
                min: {
                    args: [0],
                    msg: 'يجب أن تكون درجة النجاح أكبر من أو تساوي 0'
                },
                max: {
                    args: [100],
                    msg: 'يجب أن تكون درجة النجاح أقل من أو تساوي 100'
                },
                // التحقق من أن درجة النجاح أقل من الدرجة القصوى
                isLessThanMaxScore(value) {
                    if (parseFloat(value) >= parseFloat(this.maxScore)) {
                        throw new Error('يجب أن تكون درجة النجاح أقل من الدرجة القصوى');
                    }
                }
            }
        },

        // حالة المسابقة
        status: {
            type: DataTypes.ENUM('قادمة', 'جارية', 'منتهية'),
            allowNull: false,
            defaultValue: 'قادمة'
        },

        // عدد المتسابقات المسموح به
        maxContestants: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
            validate: {
                min: {
                    args: [1],
                    msg: 'يجب أن يكون الحد الأدنى للمتسابقات 1'
                }
            }
        },

        // ملاحظات إضافية
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        // خيارات النموذج
        timestamps: true,
        paranoid: true,

        // الدوال المساعدة
        hooks: {
            // تحديث حالة المسابقة تلقائياً
            beforeSave: async (competition) => {
                const today = new Date();
                const startDate = new Date(competition.startDate);
                const endDate = new Date(competition.endDate);

                if (today < startDate) {
                    competition.status = 'قادمة';
                } else if (today > endDate) {
                    competition.status = 'منتهية';
                } else {
                    competition.status = 'جارية';
                }
            }
        }
    });

    // دوال إضافية للنموذج

    // التحقق من إمكانية إضافة متسابقات جدد
    Competition.prototype.canAddContestants = async function(count = 1) {
        const currentCount = await sequelize.models.Score.count({
            where: { competitionId: this.id }
        });
        return (currentCount + count) <= this.maxContestants;
    };

    // حساب إحصائيات المسابقة
    Competition.prototype.getStatistics = async function() {
        const scores = await sequelize.models.Score.findAll({
            where: { competitionId: this.id }
        });

        const totalContestants = scores.length;
        let passedCount = 0;
        let totalScore = 0;

        scores.forEach(score => {
            if (score.scoreValue >= this.passingScore) {
                passedCount++;
            }
            totalScore += score.scoreValue;
        });

        return {
            totalContestants,
            passedCount,
            failedCount: totalContestants - passedCount,
            averageScore: totalContestants > 0 ? (totalScore / totalContestants).toFixed(2) : 0,
            successRate: totalContestants > 0 ? ((passedCount / totalContestants) * 100).toFixed(2) : 0
        };
    };

    return Competition;
};
