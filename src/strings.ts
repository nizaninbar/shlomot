// All Hebrew UI text lives here.
export const t = {
  appName: 'שלומות',
  tagline: 'תכנון שיעורי פילאטיס',
  save: 'שמירה',
  cancel: 'ביטול',
  delete: 'מחיקה',
  home: {
    title: 'האימונים שלי',
    emptyTitle: 'עדיין אין אימונים',
    emptyText: 'כאן יופיעו האימונים שלך. בקרוב אפשר יהיה להוסיף את הראשון.',
  },
  equipment: {
    link: 'ציוד',
    title: 'ציוד',
    newPlaceholder: 'שם ציוד חדש',
    add: 'הוספה',
    rename: 'שינוי שם',
    emptyTitle: 'אין ציוד עדיין',
    emptyText: 'הוסיפי ציוד כדי לסמן אותו באימונים.',
    duplicate: 'ציוד בשם הזה כבר קיים',
    saveFailed: 'הפעולה נכשלה, נסי שוב',
    confirmDelete: (name: string) => `למחוק את "${name}"? הציוד יוסר גם מכל האימונים.`,
  },
} as const
