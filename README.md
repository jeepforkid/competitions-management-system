
# نظام إدارة المسابقات والمتسابقات

نظام متكامل لإدارة المسابقات والمتسابقات والمشرفات مع دعم كامل للغة العربية.

## التثبيت المحلي

1. **نسخ المستودع**:
   ```bash
   git clone https://github.com/yourusername/competitions-management-system.git
   cd competitions-management-system
   ```

2. **تثبيت التبعيات**:
   ```bash
   npm install
   ```

3. **إنشاء ملف `.env`** في المجلد الرئيسي:
   ```
   PORT=3000
   DATABASE_URL=your_database_url
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. **تشغيل التطبيق**:
   ```bash
   npm start
   ```

   للتطوير، يمكنك استخدام:
   ```bash
   npm run dev
   ```

## التثبيت على Render.com

### 1. إعداد قاعدة البيانات

1. قم بتسجيل الدخول إلى [Render.com](https://render.com)
2. اذهب إلى لوحة التحكم
3. انقر على "New +" واختر "PostgreSQL"
4. املأ المعلومات التالية:
   - Name: competitions-db (أو أي اسم تختاره)
   - Database: competitions
   - User: competitions_user
   - Region: اختر أقرب منطقة لك
5. انقر على "Create Database"
6. احتفظ برابط الاتصال (Internal Database URL) لاستخدامه لاحقاً

### 2. تثبيت التطبيق

1. من لوحة التحكم في Render.com، انقر على "New +" واختر "Web Service"
2. اختر "Build and deploy from a Git repository"
3. اختر مستودع GitHub الخاص بالمشروع
4. املأ المعلومات التالية:
   - Name: competitions-app (أو أي اسم تختاره)
   - Region: نفس منطقة قاعدة البيانات
   - Branch: main
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node app.js`

5. أضف المتغيرات البيئية التالية:
   ```
   DATABASE_URL=[رابط قاعدة البيانات الذي حصلت عليه]
   NODE_ENV=production
   SESSION_SECRET=[مفتاح عشوائي آمن]
   ```

6. انقر على "Create Web Service"

### 3. الوصول إلى التطبيق

بعد اكتمال النشر، يمكنك الوصول إلى التطبيق عبر الرابط الذي يوفره Render.com.

### ملاحظات مهمة للنشر

- تأكد من أن المتغيرات البيئية صحيحة
- قم بإنشاء نسخة احتياطية لقاعدة البيانات بشكل دوري
- راجع سجلات التطبيق في Render.com لمتابعة أي أخطاء محتملة

## نظرة عامة على المشروع

نظام إدارة المسابقات هو تطبيق ويب مصمم لإدارة المسابقات والمتسابقات بكفاءة. تم بناؤه باستخدام Express.js و EJS للواجهة الأمامية، وهو مصمم لتبسيط عملية إدارة المسابقات.

## المميزات الرئيسية

- إدارة كاملة للمتسابقات والمشرفات والمسابقات
- إدارة الدرجات وتتبع النتائج
- استيراد وتصدير البيانات بصيغ Excel و CSV
- واجهة مستخدم عربية سهلة وبسيطة
- تصميم متجاوب مع جميع الأجهزة
- رسائل تنبيه للعمليات الناجحة والأخطاء
- إدارة سهلة للبيانات باستخدام Sequelize ORM
- دعم رفع الملفات

## التبعيات الرئيسية

- **express**: إطار عمل الويب
- **ejs**: محرك القوالب
- **sequelize**: ORM لقواعد البيانات
- **pg**: عميل PostgreSQL
- **exceljs**: معالجة ملفات Excel
- **fast-csv**: معالجة ملفات CSV
- **connect-flash**: رسائل التنبيه
- **method-override**: دعم طرق HTTP PUT/DELETE
- **multer**: معالجة رفع الملفات
- **dotenv**: إدارة المتغيرات البيئية

للتطوير:
- **nodemon**: إعادة تشغيل التطبيق تلقائياً عند تغيير الملفات

## هيكل المشروع

```
competitions-management-system/
│
├── app.js                     # الملف الرئيسي للتطبيق
├── config.js                  # إعدادات التطبيق والمتغيرات البيئية
├── models/                    # نماذج قاعدة البيانات
│   ├── contestant.js         # نموذج المتسابقة
│   ├── supervisor.js         # نموذج المشرفة
│   ├── competition.js        # نموذج المسابقة
│   └── score.js             # نموذج الدرجات
├── routes/                    # مسارات التطبيق
├── views/                     # قوالب EJS للعرض
│   ├── partials/             # الأجزاء المشتركة (header, footer)
│   └── ...                   # القوالب الأخرى
├── public/                    # الملفات الثابتة
└── package.json              # تبعيات المشروع
```

## الترخيص

هذا المشروع مرخص تحت رخصة MIT. راجع ملف LICENSE للتفاصيل.

---

للمساهمة في تطوير المشروع، يرجى فتح issue أو تقديم pull request.
