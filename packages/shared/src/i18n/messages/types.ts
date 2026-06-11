/** settings.tabs.* gibi iç içe gruplar için */
export type NestedSection = Record<string, string | Record<string, string>>;

export type MessageTree = {
  nav: Record<string, string>;
  common: Record<string, string>;
  auth: Record<string, string>;
  settings: NestedSection;
  pos: Record<string, string>;
  orders: Record<string, string>;
  customers: Record<string, string>;
  search: Record<string, string>;
  landing: Record<string, string>;
  license: Record<string, string>;
  reports: Record<string, string>;
  account: Record<string, string>;
  enums: Record<string, string>;
  layout: Record<string, string>;
  validation: Record<string, string>;
  products: Record<string, string>;
  colors: Record<string, string>;
  errors: Record<string, string>;
  pdf: Record<string, string>;
};
