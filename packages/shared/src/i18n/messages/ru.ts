import type { MessageTree } from "./types";
import { buildLocaleFromEnglish } from "./build-locale";

const ruPatch = {
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
    expand: "Развернуть меню",
    closeMenu: "Закрыть меню",
    openMenu: "Открыть меню",
    edit: "Изменить",
    delete: "Удалить",
    apply: "Применить",
    reset: "Сбросить",
    panel: "Моя панель",
  },
  auth: {
    loginTitle: "Вход в аккаунт",
    loginSubtitle: "Доступ к лицензии и панели управления",
    signupTitle: "Создать бесплатный аккаунт",
    signupSubtitle: "14-дневная пробная версия — без карты",
    login: "Войти",
    signup: "14 дней бесплатно",
    signupShort: "Бесплатная регистрация",
    loggingIn: "Вход…",
    signingUp: "Регистрация…",
    forgotPassword: "Забыли пароль?",
    noAccount: "Нет аккаунта?",
    signupLink: "Зарегистрироваться",
    hasAccount: "Уже есть аккаунт?",
    loginLink: "Войти",
  },
  settings: {
    language: "Язык",
    languageHint: "По умолчанию язык браузера; можно изменить здесь.",
    title: "Настройки",
    subtitle: "Профиль, товары, цены и интеграции",
  },
  landing: {
    badge: "ПО для химчистки нового поколения",
    heroTitle: "Приём заказов ещё никогда не был таким",
    heroHighlight: "простым",
    heroTitleEnd: "",
    ctaTrial: "Попробовать 14 дней бесплатно",
    ctaLogin: "Войти в аккаунт",
    featuresTitle: "Почему CleanLedger?",
  },
  pos: {
    pay: "Оплатить",
    cartTitle: "Заказ",
    customerTitle: "Клиент",
    successTitle: "Заказ сохранён",
  },
  orders: {
    title: "Отслеживание заказов",
    subtitle: "Активные заказы, доставка и оплата",
  },
  customers: {
    title: "Клиенты",
    add: "Новый клиент",
  },
};

export const ru: MessageTree = buildLocaleFromEnglish(ruPatch);
