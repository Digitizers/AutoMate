

# גיבוי נתונים לגוגל דרייב

## סקירה כללית
נוסיף אפשרות לגבות את כל נתוני המלאי לגוגל דרייב כקובץ Excel. המשתמש ילחץ על כפתור "גיבוי לגוגל דרייב" ובפעם הראשונה יתבקש להזין את פרטי ההתחברות לגוגל. הקובץ יישמר ישירות בגוגל דרייב שלו.

## איך זה עובד

1. **פונקציית Backend** -- תקרא את כל נתוני הרכבים מהדאטאבייס, תמיר אותם לקובץ Excel (CSV), ותעלה אותם לגוגל דרייב באמצעות Google Drive API
2. **כפתור בממשק** -- כפתור חדש בדף המלאי ליד הכפתור הקיים של ייצוא לאקסל

## דרישות מוקדמות -- הגדרת Google Service Account

כדי שהמערכת תוכל להעלות קבצים לגוגל דרייב, צריך ליצור Google Service Account:

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com)
2. צור פרויקט חדש (או השתמש בקיים)
3. הפעל את Google Drive API
4. צור Service Account וצור מפתח JSON
5. שתף תיקיה בגוגל דרייב שלך עם כתובת המייל של ה-Service Account

אני אבקש ממך להזין את פרטי ה-Service Account כ-secret מאובטח.

## שלבי מימוש

### שלב 1: הגדרת Secrets
- בקשה מהמשתמש להזין `GOOGLE_SERVICE_ACCOUNT_KEY` (תוכן קובץ ה-JSON)
- בקשה מהמשתמש להזין `GOOGLE_DRIVE_FOLDER_ID` (מזהה התיקייה בגוגל דרייב)

### שלב 2: יצירת Edge Function -- `backup-to-drive`
- תקרא את כל הרכבים מטבלת `vehicles` וההוצאות מ-`vehicle_expenses`
- תמיר את הנתונים לפורמט CSV עם כותרות בעברית (בדומה לייצוא הקיים)
- תתחבר ל-Google Drive API באמצעות ה-Service Account
- תעלה את הקובץ לתיקייה המוגדרת עם שם שכולל תאריך (למשל: `גיבוי_מלאי_2026-02-20.csv`)

### שלב 3: עדכון ממשק המשתמש
- הוספת כפתור "גיבוי לגוגל דרייב" בדף המלאי (Inventory.tsx) ליד כפתור הייצוא לאקסל
- הצגת מצב טעינה בזמן הגיבוי
- הודעת הצלחה/שגיאה ב-toast

## פרטים טכניים

### Edge Function (`supabase/functions/backup-to-drive/index.ts`)
- אימות משתמש מחובר (רק מנהלים יכולים לגבות)
- שליפת נתונים מ-Supabase עם service role key
- יצירת JWT token מה-Service Account key לאימות מול Google API
- העלאת קובץ CSV ל-Google Drive דרך multipart upload API
- החזרת קישור לקובץ שנוצר

### עדכון Inventory.tsx
- הוספת כפתור עם אייקון של ענן/גיבוי
- קריאה ל-Edge Function דרך `supabase.functions.invoke('backup-to-drive')`
- טיפול בשגיאות והצגת הודעות

### עדכון config.toml
- הגדרת `verify_jwt = false` לפונקציה (אימות ידני בקוד)
