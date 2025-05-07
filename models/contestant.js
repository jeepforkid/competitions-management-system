// نموذج المتسابقة
module.exports = (sequelize, DataTypes) => {
    const Contestant = sequelize.define('Contestant', {
        // معرف المتسابقة
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        // اسم المتسابقة
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال اسم المتسابقة'
                },
                len: {
                    args: [2, 100],
                    msg: 'يجب أن يكون اسم المتسابقة بين 2 و 100 حرف'
                }
            }
        },

        // تاريخ الميلاد
        birthDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال تاريخ الميلاد'
                },
                isDate: {
                    msg: 'يجب إدخال تاريخ صحيح'
                },
                // التحقق من أن العمر مناسب
                isValidAge(value) {
                    const today = new Date();
                    const birthDate = new Date(value);
                    const age = today.getFullYear() - birthDate.getFullYear();
                    if (age < 5 || age > 25) {
                        throw new Error('العمر يجب أن يكون بين 5 و 25 سنة');
                    }
                }
            }
        },

        // العنوان
        address: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: {
                    args: [0, 200],
                    msg: 'العنوان يجب أن لا يتجاوز 200 حرف'
                }
            }
        },

        // المستوى التعليمي
        educationLevel: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال المستوى التعليمي'
                }
            }
        },

        // رقم التسجيل
        registrationNumber: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال رقم التسجيل'
                }
            }
        },

        // حالة المتسابقة (نشطة/غير نشطة)
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        // ملاحظات
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // معرف المشرفة (سيتم ربطه من خلال العلاقات)
        supervisorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Supervisors',
                key: 'id'
            }
        }
    }, {
        // خيارات النموذج
        timestamps: true, // إضافة حقول createdAt و updatedAt
        paranoid: true,  // الحذف الناعم (soft delete)

        // الدوال المساعدة
        hooks: {
            // توليد رقم تسجيل فريد قبل الإنشاء
            beforeCreate: async (contestant) => {
                if (!contestant.registrationNumber) {
                    const year = new Date().getFullYear();
                    const count = await sequelize.models.Contestant.count();
                    contestant.registrationNumber = `${year}-${(count + 1).toString().padStart(4, '0')}`;
                }
            }
        }
    });

    // دوال إضافية للنموذج
    
    // حساب متوسط درجات المتسابقة
    Contestant.prototype.calculateAverageScore = async function() {
        const scores = await this.getScores();
        if (scores.length === 0) return 0;
        
        const sum = scores.reduce((total, score) => total + score.scoreValue, 0);
        return (sum / scores.length).toFixed(2);
    };

    // الحصول على آخر درجة
    Contestant.prototype.getLatestScore = async function() {
        const score = await sequelize.models.Score.findOne({
            where: { contestantId: this.id },
            order: [['createdAt', 'DESC']]
        });
        return score;
    };

    return Contestant;
};
