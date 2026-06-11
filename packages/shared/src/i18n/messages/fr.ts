import type { MessageTree } from "./en";

export const fr: MessageTree = {
  nav: {
    pos: "Commande (POS)",
    orders: "Suivi des commandes",
    customers: "Clients",
    reports: "Rapports",
    settings: "Paramètres",
    account: "Mon compte",
  },
  common: {
    logout: "Déconnexion",
    search: "Rechercher",
    welcome: "Bienvenue, {{name}} — {{company}}",
    loading: "Chargement…",
    save: "Enregistrer",
    cancel: "Annuler",
    collapse: "Réduire",
  },
  auth: {
    loginTitle: "Connectez-vous à votre compte",
    loginSubtitle: "Accédez à votre licence et panneau d'activité",
    signupTitle: "Créer un compte gratuit",
    signupSubtitle: "Essai de 14 jours — sans carte bancaire",
    email: "E-mail",
    password: "Mot de passe",
    city: "Ville",
    companyName: "Nom de l'entreprise",
    ownerName: "Responsable",
    phone: "Téléphone",
    login: "Connexion",
    signup: "Commencer 14 jours gratuits",
    loggingIn: "Connexion…",
    signingUp: "Création du compte…",
  },
  settings: {
    language: "Langue",
    languageHint: "Langue du navigateur par défaut ; modifiable ici.",
  },
};
