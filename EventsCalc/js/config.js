/* App configuration.
   googleClientId: an OAuth 2.0 "Web application" client ID from Google Cloud Console
   (APIs & Services → Credentials). Its authorized JavaScript origins must include
   https://bravh.github.io and http://localhost:8787 .
   Leave empty to let the user paste a client ID in the app's Settings screen instead. */
window.APP_CONFIG = {
  googleClientId: '',
  syncFileName: 'eventledger.json'
};
