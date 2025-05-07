// نموذج الدرجات
module.exports = (sequelize, DataTypes) => {
    const Score = sequelize.define('Score', {
        // معرف الدرجة
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // معرف المتسابقة (سيتم ربطه من خلال العلاقات)
        contestantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Contestants',
                key: 'id'
            },
            validate: {
                notNull: {
                    msg: 'يجب تحديد المتسابقة'
                }
            }
        },

        // معرف المسابقة (سيتم ربطه من خلال العلاقات)
        competitionId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Competitions',
                key: 'id'
            },
            validate: {
                notNull: {
                    msg: 'يجب تحديد المسابقة'
                }
            }
        },

        // معرف المشرفة (سيتم ربطه من خلال العلاقات)
        supervisorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Supervisors',
                key: 'id'
            },
            validate: {
                notNull: {
                    msg: 'يجب تحديد المشرفة'
                }
            }
        },

        // قيمة الدرجة
        scoreValue: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            validate: {
                notNull: {
                    msg: 'يجب إدخال الدرجة'
                },
                min: {
                    args: [0],
                    msg: 'يجب أن تكون الدرجة أكبر من أو تساوي 0'
                },
                max: {
                    args: [100],
                    msg: 'يجب أن تكون الدرجة أقل من أو تساوي 100'
                },
                // التحقق من أن الدرجة لا تتجاوز الدرجة القصوى للمسابقة
                async isValidScore(value) {
                    if (this.competitionId) {
                        const competition = await sequelize.models.Competition.findByPk(this.competitionId);
                        if (competition && parseFloat(value) > parseFloat(competition.maxScore)) {
                            throw new Error('الدرجة تتجاوز الدرجة القصوى المسموح بها في المسابقة');
                        }
                    }
                }
            }
        },

        // تاريخ إدخال الدرجة
        entryDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            validate: {
                notNull: {
                    msg: 'يجب تحديد تاريخ إدخال الدرجة'
                },
                // التحقق من أن تاريخ الإدخال ضمن فترة المسابقة
                async isWithinCompetitionPeriod(value) {
                    if (this.competitionId) {
                        const competition = await sequelize.models.Competition.findByPk(this.competitionId);
                        if (competition) {
                            const entryDate = new Date(value);
                            const startDate = new Date(competition.startDate);
                            const endDate = new Date(competition.endDate);
                            endDate.setHours(23, 59, 59); // تعيين نهاية اليوم

                            if (entryDate < startDate || entryDate > endDate) {
                                throw new Error('تاريخ إدخال الدرجة يجب أن يكون ضمن فترة المسابقة');
                            }
                        }
                    }
                }
            }
        },

        // ملاحظات
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 500],
                    msg: 'الملاحظات يجب أن لا تتجاوز 500 حرف'
                }
            }
        }
    }, {
        // خيارات النموذج
        timestamps: true,
        paranoid: true,

        // القيود الفريدة
        indexes: [
            {
                unique: true,
                fields: ['contestantId', 'competitionId'],
                name: 'unique_contestant_competition'
            }
        ],

        // الدوال المساعدة
        hooks: {
            // التحقق قبل إنشاء الدرجة
            beforeCreate: async (score) => {
                // التحقق من أن المتسابقة مسجلة تحت إشراف المشرفة المحددة
                const contestant = await sequelize.models.Contestant.findByPk(score.contestantId);
                if (contestant && contestant.supervisorId !== score.supervisorId) {
                    throw new Error('لا يمكن إدخال درجة لمتسابقة غير مسجلة تحت إشرافك');
                }

                // التحقق من عدم تجاوز الحد الأقصى للمتسابقات في المسابقة
                const competition = await sequelize.models.Competition.findByPk(score.competitionId);
                if (competition) {
                    const canAdd = await competition.canAddContestants();
                    if (!canAdd) {
                        throw new Error('تم تجاوز الحد الأقصى للمتسابقات في هذه المسابقة');
                    }
                }
            }
        }
    });

    // دوال إضافية للنموذج

    // التحقق من حالة النجاح
    Score.prototype.isPassing = async function() {
        const competition = await sequelize.models.Competition.findByPk(this.competitionId);
        return competition ? this.scoreValue >= competition.passingScore : false;
    };

    // الحصول على ترتيب المتسابقة في المسابقة
    Score.prototype.getRank = async function() {
        const higherScores = await Score.count({
            where: {
                competitionId: this.competitionId,
                scoreValue: {
                    [sequelize.Op.gt]: this.scoreValue
                }
            }
        });
        return higherScores + 1;
    };

    return Score;
};
