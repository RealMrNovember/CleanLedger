import type { MessageTree } from "./en";

export const it: MessageTree = {
  nav: {
    pos: "Ordine (POS)",
    orders: "Tracciamento ordini",
    customers: "Clienti",
    reports: "Report",
    settings: "Impostazioni",
    account: "Il mio account",
  },
  common: {
    logout: "Esci",
    search: "Cerca",
    welcome: "Benvenuto, {{name}} — {{company}}",
    loading: "Caricamento…",
    save: "Salva",
    cancel: "Annulla",
    collapse: "Comprimi",
  },
  auth: {
    loginTitle: "Accedi al tuo account",
    loginSubtitle: "Accedi a licenza e pannello aziendale",
    signupTitle: "Crea un account gratuito",
    signupSubtitle: "Prova di 14 giorni — nessuna carta richiesta",
    email: "E-mail",
    password: "Password",
    city: "Città",
    companyName: "Nome azienda",
    ownerName: "Responsabile",
    phone: "Telefono",
    login: "Accedi",
    signup: "Inizia 14 giorni gratis",
    loggingIn: "Accesso…",
    signingUp: "Registrazione…",
  },
  settings: {
    language: "Lingua",
    languageHint: "Predefinita dal browser; puoi cambiarla qui.",
  },
};
