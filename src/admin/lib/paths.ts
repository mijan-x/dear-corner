/** Admin URLs. */
export const admin = {
  home: "/admin",
  orders: "/admin/orders",
  order: (id: string) => `/admin/orders/${id}`,
  print: (id: string, doc: "invoice" | "label") =>
    `/admin/print/${id}?doc=${doc}`,
  products: "/admin/products",
  product: (id: string) => `/admin/products/${id}`,
  newProduct: "/admin/products/new",
  categories: "/admin/products/categories",
  collections: "/admin/products/collections",
  inventory: "/admin/inventory",
  coupons: "/admin/coupons",
  customers: "/admin/customers",
  shipping: "/admin/shipping",
  reviews: "/admin/reviews",
  messages: "/admin/messages",
  settings: "/admin/settings",
  activity: "/admin/activity",
} as const;
