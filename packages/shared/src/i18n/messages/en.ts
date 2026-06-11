export const en = {
  nav: {
    pos: "Order (POS)",
    orders: "Order tracking",
    customers: "Customers",
    reports: "Reports",
    settings: "Settings",
    account: "My account",
  },
  common: {
    logout: "Log out",
    search: "Search",
    welcome: "Welcome, {{name}} — {{company}}",
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    collapse: "Collapse",
  },
  auth: {
    loginTitle: "Sign in to your account",
    loginSubtitle: "Access your license and business panel",
    signupTitle: "Create a free account",
    signupSubtitle: "14-day trial starts automatically — no credit card",
    email: "Email",
    password: "Password",
    city: "City",
    companyName: "Company name",
    ownerName: "Owner name",
    phone: "Phone",
    login: "Sign in",
    signup: "Start 14-day free trial",
    loggingIn: "Signing in…",
    signingUp: "Creating account…",
  },
  settings: {
    language: "Language",
    languageHint: "Defaults to your browser language; you can override here.",
  },
};

export type MessageTree = {
  nav: {
    pos: string;
    orders: string;
    customers: string;
    reports: string;
    settings: string;
    account: string;
  };
  common: {
    logout: string;
    search: string;
    welcome: string;
    loading: string;
    save: string;
    cancel: string;
    collapse: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    signupTitle: string;
    signupSubtitle: string;
    email: string;
    password: string;
    city: string;
    companyName: string;
    ownerName: string;
    phone: string;
    login: string;
    signup: string;
    loggingIn: string;
    signingUp: string;
  };
  settings: {
    language: string;
    languageHint: string;
  };
};
