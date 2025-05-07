// نموذج المستخدم
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        // معرف المستخدم
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        
        // اسم المستخدم
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال اسم المستخدم'
                },
                len: {
                    args: [3, 50],
                    msg: 'يجب أن يكون اسم المستخدم بين 3 و 50 حرفاً'
                }
            }
        },
        
        // كلمة المرور (مشفرة)
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال كلمة المرور'
                }
            }
        },
        
        // الدور (صلاحيات المستخدم)
        role: {
            type: DataTypes.ENUM('viewer', 'editor', 'admin'),
            allowNull: false,
            defaultValue: 'viewer',
            validate: {
                isIn: {
                    args: [['viewer', 'editor', 'admin']],
                    msg: 'الدور غير صالح'
                }
            }
        },
        
        // الاسم الكامل للمستخدم
        fullName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'يجب إدخال الاسم الكامل'
                }
            }
        },
        
        // حالة المستخدم (نشط/غير نشط)
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        
        // تاريخ آخر تسجيل دخول
        lastLogin: {
            type: DataTypes.DATE
        }
    }, {
        // خيارات النموذج
        timestamps: true, // إضافة حقول createdAt و updatedAt
        paranoid: true,  // الحذف الناعم (soft delete)
        
        // الدوال المساعدة
        hooks: {
            // تشفير كلمة المرور قبل الحفظ
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    // دوال إضافية للنموذج
    User.prototype.verifyPassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };

    // التحقق من صلاحيات المستخدم
    User.prototype.hasPermission = function(requiredRole) {
        const roles = {
            'viewer': 1,
            'editor': 2,
            'admin': 3
        };
        return roles[this.role] >= roles[requiredRole];
    };

    return User;
};
