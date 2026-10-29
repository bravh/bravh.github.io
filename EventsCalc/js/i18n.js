/* i18n: Hebrew (default) + English */
const I18N = {
  he: {
    app: 'פנקס אירועים',
    nav: { home: 'בית', contacts: 'אנשי קשר', events: 'אירועים', settings: 'הגדרות' },
    common: {
      save: 'שמירה', cancel: 'ביטול', delete: 'מחיקה', edit: 'עריכה', close: 'סגירה', add: 'הוספה',
      search: 'חיפוש', yes: 'כן', no: 'לא', confirmDelete: 'למחוק? פעולה זו אינה הפיכה.',
      notes: 'הערות', name: 'שם', phone: 'טלפון', date: 'תאריך', time: 'שעה', location: 'מקום',
      amount: 'סכום', people: 'אנשים', total: 'סה"כ', none: 'אין', back: 'חזרה', done: 'סיום',
      currency: '₪', copy: 'העתקה', copied: 'הועתק', share: 'שיתוף', saved: 'נשמר', deleted: 'נמחק',
      required: 'חובה למלא שדה זה', optional: 'אופציונלי', all: 'הכל', more: 'עוד', select: 'בחירה'
    },
    home: {
      searchPh: 'חיפוש איש קשר, אירוע, טלפון…',
      received: 'קיבלתי', gave: 'נתתי', balance: 'מאזן', events: 'אירועים', contacts: 'אנשי קשר',
      upcoming: 'אירועים קרובים', recent: 'פעולות אחרונות', noResults: 'לא נמצאו תוצאות',
      quick: 'פעולות מהירות', addGave: 'הייתי באירוע', addReceived: 'אירוע שלי', addContact: 'איש קשר חדש',
      owedToMe: 'חייבים לי', iOwe: 'אני חייב', even: 'מאוזן'
    },
    contacts: {
      title: 'אנשי קשר', new: 'איש קשר חדש', edit: 'עריכת איש קשר', category: 'קטגוריה',
      empty: 'אין עדיין אנשי קשר. הוסיפו את הראשון.', import: 'ייבוא מהטלפון', importNA: 'ייבוא אנשי קשר לא נתמך בדפדפן זה',
      imported: 'יובאו {n} אנשי קשר', history: 'היסטוריית אירועים', noHistory: 'אין עדיין אירועים משותפים',
      gaveMe: 'נתן/ה לי', iGave: 'נתתי', net: 'מאזן נטו', partner: 'בן/בת זוג', sortName: 'לפי שם', sortBalance: 'לפי מאזן',
      filterCat: 'סינון לפי קטגוריה',
      importGoogle: 'ייבוא מאנשי הקשר של Google', importing: 'מייבא…', importGoogleDone: 'יובאו {n} חדשים, {s} כבר היו קיימים'
    },
    cat: {
      friends: 'חברים', family: 'משפחה', work: 'עבודה', class: 'לימודים', army: 'צבא',
      neighbors: 'שכנים', other: 'אחר', manage: 'ניהול קטגוריות', newCat: 'קטגוריה חדשה'
    },
    events: {
      title: 'אירועים', new: 'אירוע חדש', edit: 'עריכת אירוע', mine: 'האירועים שלי', attended: 'הייתי מוזמן',
      typeMine: 'אירוע שלי (אני מארח)', typeAttended: 'הוזמנתי (אני נותן)', eventName: 'שם האירוע',
      kind: 'סוג אירוע', host: 'מי הזמין אותי', companions: 'כמה באו איתי', giftGiven: 'מה נתתי',
      method: 'אופן תשלום', cash: 'מזומן', cheque: "צ'ק", transfer: 'העברה', gift: 'מתנה',
      guests: 'מוזמנים', addGuest: 'הוספת מוזמן', guestCount: 'מוזמנים', came: 'הגיעו', giftsTotal: 'סה"כ מתנות',
      empty: 'אין עדיין אירועים', upcoming: 'קרוב', past: 'עבר', today: 'היום',
      layout: 'מפת מקומות', invite: 'הזמנה', noGuests: 'אין עוד מוזמנים. הוסיפו מאנשי הקשר.',
      guestGift: 'מתנה שהתקבלה', guestCompanions: 'כמה הגיעו', table: 'שולחן', seats: 'מקומות', noTable: 'ללא שולחן',
      status: 'סטטוס', invited: 'הוזמן', approved: 'אישר/ה', declined: 'לא מגיע/ה', arrived: 'הגיע/ה',
      kinds: { wedding: 'חתונה', barmitzvah: 'בר/בת מצווה', brit: 'ברית', birthday: 'יום הולדת', henna: 'חינה', engagement: 'אירוסין', other: 'אחר' },
      pickContact: 'בחירת איש קשר', summary: 'סיכום', avgGift: 'ממוצע למתנה', approvedCount: 'אישרו הגעה',
      seatsTaken: 'תפוסים', seatsFree: 'פנויים'
    },
    layout: {
      title: 'מפת מקומות', round: 'עגול', square: 'מרובע', rect: 'מלבני', stage: 'במה/רחבה',
      addTable: 'הוספת שולחן', seats: 'מספר מקומות', tableName: 'שם/מספר שולחן', assign: 'הושבת מוזמנים',
      remove: 'הסרת שולחן', hint: 'הקישו על שולחן לעריכה, גררו להזזה', empty: 'המפה ריקה. הוסיפו שולחן ראשון.',
      free: 'פנוי', taken: 'תפוס', arrived: 'הגיע', unassigned: 'מוזמנים ללא שולחן', atTable: 'יושבים כאן',
      needSeats: 'דרושים {n} מקומות', zoom: 'תצוגה', fullCapacity: 'השולחן מלא'
    },
    invite: {
      title: 'הזמנה', preview: 'תצוגה מקדימה', send: 'שליחה', sendWa: 'שליחה בוואטסאפ', sendSms: 'שליחה ב-SMS',
      copy: 'העתקת טקסט', noPhone: 'אין טלפון לאיש קשר זה',
      template: 'הוזמנתם ל{event}!\n📅 {date} בשעה {time}\n📍 {location}\n{table}{rsvp}',
      tableLine: '🪑 שולחן: {table}\n', rsvpLine: '\nנשמח לאישור הגעה 🙏', greeting: 'ברכה אישית',
      sendAll: 'שליחה לכל המוזמנים', bulkHint: 'כל לחיצה פותחת שיחה אחת. סמנו למי כבר נשלח.', sent: 'נשלח'
    },
    settings: {
      title: 'הגדרות', language: 'שפה', he: 'עברית', en: 'English', data: 'נתונים', export: 'ייצוא גיבוי (JSON)',
      import: 'ייבוא גיבוי', clear: 'מחיקת כל הנתונים', cleared: 'הנתונים נמחקו', imported: 'הגיבוי יובא',
      badFile: 'קובץ לא תקין', about: 'אודות', version: 'גרסה', local: 'הנתונים נשמרים במכשיר זה. עם כניסה לחשבון Google הם מסונכרנים גם לדרייב שלך.',
      demo: 'טעינת נתוני דוגמה', categories: 'קטגוריות', myName: 'השם שלי (להזמנות)', partnerName: 'שם בן/בת זוג'
    },
    auth: {
      account: 'חשבון Google', signIn: 'כניסה עם Google', signOut: 'יציאה מהחשבון', signedInAs: 'מחובר/ת בתור',
      clientId: 'Google Client ID',
      clientIdHint: 'ב-Google Cloud Console (APIs & Services → Credentials) צרו OAuth client ID מסוג Web application, והוסיפו ל-Authorized JavaScript origins את https://bravh.github.io ואת http://localhost:8787. הפעילו את Google Drive API ואת People API, ואז הדביקו כאן את ה-Client ID.',
      saveClientId: 'שמירת Client ID', changeClientId: 'שינוי Client ID',
      notConfigured: 'כדי להתחבר יש להזין Client ID בהגדרות',
      errors: {
        not_configured: 'לא הוגדר Client ID של Google',
        gis_unavailable: 'ספריית Google לא נטענה (בדקו חיבור/חוסם פרסומות)',
        popup_closed: 'חלון הכניסה נסגר',
        access_denied: 'הגישה נדחתה',
        interaction_required: 'נדרשת כניסה מחדש',
        busy: 'בקשה קודמת עדיין פעילה',
        network: 'שגיאת רשת'
      }
    },
    sync: {
      title: 'סנכרון לענן (Google Drive)',
      explain: 'הנתונים נשמרים בתיקיית האפליקציה בדרייב שלך ומסונכרנים אוטומטית בין המכשירים.',
      status: { off: 'כבוי', needsAuth: 'נדרשת כניסה מחדש', idle: 'ממתין', syncing: 'מסנכרן…', synced: 'מסונכרן', error: 'שגיאה' },
      lastSync: 'סנכרון אחרון: {time}', pushNow: 'שמירה לענן עכשיו', pullNow: 'שחזור מהענן',
      pullConfirm: 'לשחזר את הנתונים מהענן? הנתונים במכשיר זה יוחלפו.',
      restoredFromCloud: 'הנתונים שוחזרו מהענן', pushed: 'נשמר בענן'
    }
  },
  en: {
    app: 'Event Ledger',
    nav: { home: 'Home', contacts: 'Contacts', events: 'Events', settings: 'Settings' },
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', close: 'Close', add: 'Add',
      search: 'Search', yes: 'Yes', no: 'No', confirmDelete: 'Delete? This cannot be undone.',
      notes: 'Notes', name: 'Name', phone: 'Phone', date: 'Date', time: 'Time', location: 'Location',
      amount: 'Amount', people: 'People', total: 'Total', none: 'None', back: 'Back', done: 'Done',
      currency: '₪', copy: 'Copy', copied: 'Copied', share: 'Share', saved: 'Saved', deleted: 'Deleted',
      required: 'This field is required', optional: 'Optional', all: 'All', more: 'More', select: 'Select'
    },
    home: {
      searchPh: 'Search contact, event, phone…',
      received: 'Received', gave: 'Gave', balance: 'Balance', events: 'Events', contacts: 'Contacts',
      upcoming: 'Upcoming events', recent: 'Recent activity', noResults: 'No results',
      quick: 'Quick actions', addGave: 'I attended', addReceived: 'My event', addContact: 'New contact',
      owedToMe: 'Owed to me', iOwe: 'I owe', even: 'Even'
    },
    contacts: {
      title: 'Contacts', new: 'New contact', edit: 'Edit contact', category: 'Category',
      empty: 'No contacts yet. Add the first one.', import: 'Import from phone', importNA: 'Contact import is not supported in this browser',
      imported: 'Imported {n} contacts', history: 'Event history', noHistory: 'No shared events yet',
      gaveMe: 'Gave me', iGave: 'I gave', net: 'Net balance', partner: 'Partner', sortName: 'By name', sortBalance: 'By balance',
      filterCat: 'Filter by category',
      importGoogle: 'Import from Google Contacts', importing: 'Importing…', importGoogleDone: 'Imported {n} new, {s} already existed'
    },
    cat: {
      friends: 'Friends', family: 'Family', work: 'Work', class: 'Classmates', army: 'Army',
      neighbors: 'Neighbors', other: 'Other', manage: 'Manage categories', newCat: 'New category'
    },
    events: {
      title: 'Events', new: 'New event', edit: 'Edit event', mine: 'My events', attended: 'Attended',
      typeMine: 'My event (I host)', typeAttended: 'Invited (I give)', eventName: 'Event name',
      kind: 'Event type', host: 'Who invited me', companions: 'How many came with me', giftGiven: 'What I gave',
      method: 'Payment method', cash: 'Cash', cheque: 'Cheque', transfer: 'Transfer', gift: 'Gift',
      guests: 'Guests', addGuest: 'Add guest', guestCount: 'Guests', came: 'Came', giftsTotal: 'Total gifts',
      empty: 'No events yet', upcoming: 'Upcoming', past: 'Past', today: 'Today',
      layout: 'Seating map', invite: 'Invitation', noGuests: 'No guests yet. Add from contacts.',
      guestGift: 'Gift received', guestCompanions: 'How many came', table: 'Table', seats: 'Seats', noTable: 'No table',
      status: 'Status', invited: 'Invited', approved: 'Approved', declined: 'Declined', arrived: 'Arrived',
      kinds: { wedding: 'Wedding', barmitzvah: 'Bar/Bat Mitzvah', brit: 'Brit', birthday: 'Birthday', henna: 'Henna', engagement: 'Engagement', other: 'Other' },
      pickContact: 'Pick a contact', summary: 'Summary', avgGift: 'Average gift', approvedCount: 'Approved',
      seatsTaken: 'Taken', seatsFree: 'Free'
    },
    layout: {
      title: 'Seating map', round: 'Round', square: 'Square', rect: 'Rect', stage: 'Stage/Floor',
      addTable: 'Add table', seats: 'Number of seats', tableName: 'Table name/number', assign: 'Seat guests',
      remove: 'Remove table', hint: 'Tap a table to edit, drag to move', empty: 'Map is empty. Add the first table.',
      free: 'Free', taken: 'Taken', arrived: 'Arrived', unassigned: 'Guests without a table', atTable: 'Seated here',
      needSeats: 'Needs {n} seats', zoom: 'View', fullCapacity: 'Table is full'
    },
    invite: {
      title: 'Invitation', preview: 'Preview', send: 'Send', sendWa: 'Send via WhatsApp', sendSms: 'Send via SMS',
      copy: 'Copy text', noPhone: 'This contact has no phone',
      template: 'You are invited to {event}!\n📅 {date} at {time}\n📍 {location}\n{table}{rsvp}',
      tableLine: '🪑 Table: {table}\n', rsvpLine: '\nPlease confirm your attendance 🙏', greeting: 'Personal greeting',
      sendAll: 'Send to all guests', bulkHint: 'Each tap opens one chat. Mark who was already sent.', sent: 'Sent'
    },
    settings: {
      title: 'Settings', language: 'Language', he: 'עברית', en: 'English', data: 'Data', export: 'Export backup (JSON)',
      import: 'Import backup', clear: 'Delete all data', cleared: 'All data deleted', imported: 'Backup imported',
      badFile: 'Invalid file', about: 'About', version: 'Version', local: 'Data is stored on this device. When signed in with Google it is also synced to your Drive.',
      demo: 'Load demo data', categories: 'Categories', myName: 'My name (for invitations)', partnerName: 'Partner name'
    },
    auth: {
      account: 'Google account', signIn: 'Sign in with Google', signOut: 'Sign out', signedInAs: 'Signed in as',
      clientId: 'Google Client ID',
      clientIdHint: 'In Google Cloud Console (APIs & Services → Credentials) create an OAuth client ID of type Web application and add https://bravh.github.io and http://localhost:8787 as Authorized JavaScript origins. Enable the Google Drive API and the People API, then paste the client ID here.',
      saveClientId: 'Save Client ID', changeClientId: 'Change Client ID',
      notConfigured: 'Enter a Client ID in Settings to sign in',
      errors: {
        not_configured: 'Google Client ID is not set',
        gis_unavailable: 'Google library failed to load (check your connection / ad blocker)',
        popup_closed: 'The sign-in window was closed',
        access_denied: 'Access denied',
        interaction_required: 'Please sign in again',
        busy: 'A previous request is still in progress',
        network: 'Network error'
      }
    },
    sync: {
      title: 'Cloud sync (Google Drive)',
      explain: 'Your data is saved in the app folder in your Drive and synced automatically between your devices.',
      status: { off: 'Off', needsAuth: 'Sign-in required', idle: 'Idle', syncing: 'Syncing…', synced: 'Synced', error: 'Error' },
      lastSync: 'Last sync: {time}', pushNow: 'Save to cloud now', pullNow: 'Restore from cloud',
      pullConfirm: 'Restore data from the cloud? Data on this device will be replaced.',
      restoredFromCloud: 'Data restored from the cloud', pushed: 'Saved to the cloud'
    }
  }
};

let LANG = localStorage.getItem('el.lang') || 'he';

function t(path, vars) {
  const parts = path.split('.');
  let cur = I18N[LANG];
  for (const p of parts) { cur = cur && cur[p]; if (cur === undefined) break; }
  if (cur === undefined) { cur = path; }
  if (typeof cur === 'string' && vars) {
    for (const k in vars) cur = cur.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  }
  return cur;
}

function setLang(l) {
  LANG = l;
  localStorage.setItem('el.lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  document.getElementById('lang-label').textContent = l === 'he' ? 'EN' : 'עב';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.title = t('app');
}

function fmtMoney(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString(LANG === 'he' ? 'he-IL' : 'en-US') + ' ' + t('common.currency');
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(LANG === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });
}
function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(LANG === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' });
}
