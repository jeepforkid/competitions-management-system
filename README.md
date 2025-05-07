
Built by https://www.blackbox.ai

---

# نظام إدارة المسابقات والمتسابقات

نظام متكامل لإدارة المسابقات والمتسابقات والمشرفات مع دعم كامل للغة العربية.

## التثبيت المحلي

راجع قسم [Installation](#installation) أدناه للتثبيت المحلي.

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

### 3. إعداد المستخدم الأول

بعد اكتمال النشر، قم بإنشاء المستخدم الأول (المسؤول) عن طريق:

1. في لوحة تحكم Render.com، اذهب إلى Web Service الخاص بالتطبيق
2. انقر على زر "Shell" في القائمة العلوية
3. في نافذة Shell، قم بتنفيذ الأوامر التالية مباشرة:
   ```bash
   node
   ```
   
4. بعد ظهور موجه Node.js (>)، قم بتنفيذ الأوامر التالية لإعادة تعيين كلمة المرور:
   ```javascript
   const db = require('./models')
   const bcrypt = require('bcryptjs')
   
   // البحث عن المستخدم
   const user = await db.User.findOne({ where: { username: 'admin' } })
   console.log('تم العثور على المستخدم:', user ? 'نعم' : 'لا')
   
   if (user) {
     // تعيين كلمة مرور جديدة
     const newPassword = 'admin123'
     const hashedPassword = await bcrypt.hash(newPassword, 10)
     await user.update({ password: hashedPassword })
     console.log('تم تحديث كلمة المرور بنجاح')
     console.log('كلمة المرور الجديدة هي:', newPassword)
   } else {
     // إنشاء مستخدم جديد
     const newPassword = 'admin123'
     const hashedPassword = await bcrypt.hash(newPassword, 10)
     const newUser = await db.User.create({
       username: 'admin',
       password: hashedPassword,
       role: 'admin',
       fullName: 'مدير النظام',
       isActive: true
     })
     console.log('تم إنشاء مستخدم جديد')
     console.log('اسم المستخدم:', newUser.username)
     console.log('كلمة المرور:', newPassword)
   }
   
   // التأكد من صحة كلمة المرور
   const testUser = await db.User.findOne({ where: { username: 'admin' } })
   const isValid = await bcrypt.compare('admin123', testUser.password)
   console.log('تم التحقق من كلمة المرور:', isValid ? 'صحيحة' : 'غير صحيحة')
   ```

5. للخروج من موجه Node.js، اضغط:
   - CTRL + C مرتين، أو
   - اكتب `.exit` واضغط Enter

6. يمكنك الآن تسجيل الدخول باستخدام:
   - اسم المستخدم: admin
   - كلمة المرور: admin123

7. قم بتغيير كلمة المرور فوراً بعد تسجيل الدخول الأول

ملاحظة: إذا ظهرت رسالة خطأ تفيد بأن المستخدم موجود مسبقاً، يمكنك تجربة تسجيل الدخول مباشرة بالبيانات المذكورة أعلاه.

### 4. الوصول إلى التطبيق

- يمكنك الآن الوصول إلى التطبيق عبر الرابط الذي يوفره Render.com
- سجل الدخول باستخدام:
  - اسم المستخدم: admin
  - كلمة المرور: [كلمة المرور التي اخترتها]

### ملاحظات مهمة للنشر

- تأكد من أن المتغيرات البيئية صحيحة وآمنة
- قم بتغيير كلمة مرور المسؤول بعد أول تسجيل دخول
- قم بإنشاء نسخة احتياطية لقاعدة البيانات بشكل دوري
- راجع سجلات التطبيق في Render.com لمتابعة أي أخطاء محتملة

## Project Overview

The Competitions Management System is a web application designed to manage competitions and contestants effectively. It allows for user authentication, session management, and the handling of competition-related data. Built using Express.js and EJS for the frontend, the application is designed to streamline the process of managing competitions.

## Installation

To install and set up the project locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/competitions-management-system.git
   cd competitions-management-system
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the root directory to store your environment variables:
   ```
   PORT=3000
   DATABASE_URL=your_database_url
   SESSION_SECRET=your_session_secret
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

   For development, you can use:
   ```bash
   npm run dev
   ```

## Usage

Once the application is running, navigate to `http://localhost:3000/` in your browser. You will be redirected to the scores page. You can create an account, log in, and manage contests and participants through the available routes.

## Features

- User authentication with session management
- CRUD operations for contestants, supervisors, competitions, and scores
- Flash messages to display success or error notifications
- Easy data handling with Sequelize ORM for PostgreSQL
- File upload support for contestant data using Multer
- EJS templating engine for dynamic content rendering

## Dependencies

The project includes several dependencies, as listed in the `package.json`:

- **bcryptjs**: Password hashing
- **connect-flash**: Flash messages for notifications
- **dotenv**: Environment variable management
- **ejs**: Templating engine
- **express**: Web framework for Node.js
- **express-session**: Session management for Express
- **method-override**: Support for PUT and DELETE methods in HTML forms
- **multer**: Middleware for handling multipart/form-data
- **pg**: PostgreSQL client for Node.js
- **pg-hstore**: Hstore serializer for PostgreSQL
- **sequelize**: Promise-based ORM for Node.js
- **exceljs**: Excel file handling
- **fast-csv**: CSV parsing and formatting

**Development Dependency**:
- **nodemon**: Automatically restarts the application when file changes are detected during development.

## Project Structure

The project structure is organized as follows:

```
competitions-management-system/
│
├── app.js                     # Main application file
├── config.js                  # Configuration settings and environmental variables
├── models/                    # Database models (Sequelize)
├── routes/                    # Application routes (auth, contestants, supervisors, competitions, scores)
│   ├── auth.js
│   ├── contestants.js
│   ├── supervisors.js
│   ├── competitions.js
│   └── scores.js
├── views/                     # EJS views for rendering
│   ├── errors/                # Error pages (404, 500)
│   └── ...                    # Other views
├── public/                    # Static files (CSS, JS, images)
└── package.json               # Project manifest
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Feel free to contribute and suggest improvements to the project.