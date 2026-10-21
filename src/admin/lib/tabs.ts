import { admin } from "./paths";

export const productTabs = [
  { to: admin.products, label: "Products", end: true },
  { to: admin.categories, label: "Categories" },
  { to: admin.collections, label: "Collections" },
];
