/** Empty-state and error copy, word for word from brand doc section 6. */
export const emptyCopy = {
  cart: {
    title: "Your cart is waiting for a little something.",
    action: "Browse new arrivals",
  },
  search: (query: string) => ({
    title: `No results for '${query}'.`,
    body: "Try a shorter word or browse a category.",
  }),
  orders: {
    title: "No orders yet.",
    body: "Your first one will show up here.",
  },
  notFound: {
    title: "This corner is empty.",
    body: "Let's get you back to the shop.",
  },
} as const;

export const errorCopy = {
  phone: "Enter an 11-digit mobile number, like 01712345678.",
  coupon: "That code isn't valid or has expired.",
  payment: "Payment didn't go through. Try again or choose Cash on Delivery.",
  connection: "Connection lost. Check your internet and try again.",
  orderLookup:
    "We couldn't find that order. Check the order number and phone number you used.",
} as const;
