import type { MessageTree } from "./en";

export const ru: MessageTree = {
  nav: {
    pos: "Заказ (POS)",
    orders: "Отслеживание заказов",
    customers: "Клиенты",
    reports: "Отчёты",
    settings: "Настройки",
    account: "Мой аккаунт",
  },
  common: {
    logout: "Выйти",
    search: "Поиск",
    welcome: "Добро пожаловать, {{name}} — {{company}}",
    loading: "Загрузка…",
    save: "Сохранить",
    cancel: "Отмена",
    collapse: "Свернуть",
  },
  auth: {
    loginTitle: "Вход в аккаунт",
    loginSubtitle: "Доступ к лицензии и панели управления",
    signupTitle: "Создать бесплатный аккаунт",
    signupSubtitle: "14-дневная пробная версия — карта не нужна",
    email: "Эл. почта",
    password: "Пароль",
    city: "Город",
    companyName: "Название компании",
    ownerName: "Ответственный",
    phone: "Телефон",
    login: "Войти",
    signup: "Начать 14 дней бесплатно",
    loggingIn: "Вход…",
    signingUp: "Регистрация…",
  },
  settings: {
    language: "Язык",
    languageHint: "По умолчанию язык браузера; можно изменить здесь.",
  },
};
