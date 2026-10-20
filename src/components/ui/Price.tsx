import { discountPercent, formatPrice } from "../../utils/formatPrice";
import { cx } from "../../utils/cx";
import Badge from "./Badge";

type PriceProps = {
  /** Current price in taka. */
  price: number;
  /** Old price; shown struck through only when higher than the price. */
  compareAt?: number | null;
  /** Variants at different prices: "From ৳890". */
  from?: boolean;
  /** card: product cards · page: product page (adds badge and "You save") · inline: cart lines */
  size?: "card" | "page" | "inline";
  className?: string;
};

/**
 * Price block (brand doc sections 3 and 6). Regular: ink, bold. Sale: sale
 * price in terracotta deep first, old price struck through in soft ink after
 * it. The price is always the boldest text near it. Tabular figures.
 */
function Price({
  price,
  compareAt,
  from = false,
  size = "card",
  className,
}: PriceProps) {
  const onSale = typeof compareAt === "number" && compareAt > price;
  const percent = onSale ? discountPercent(compareAt, price) : null;
  const main = {
    card: "type-price-card",
    page: "type-price",
    inline: "figures font-bold text-[15px] leading-5",
  }[size];

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cx(main, onSale ? "text-terracotta-deep" : "text-ink")}
        >
          {onSale && <span className="sr-only">Sale price: </span>}
          {from && <span className="font-medium">From </span>}
          {formatPrice(price)}
        </span>
        {onSale && (
          <>
            <span className="sr-only">, was </span>
            <del className="type-price-old">{formatPrice(compareAt)}</del>
          </>
        )}
        {onSale && size === "page" && percent !== null && (
          <Badge kind="sale" className="self-center">
            -{percent}%
          </Badge>
        )}
      </p>
      {onSale && size === "page" && (
        <p className="type-caption font-medium text-terracotta-deep">
          You save{" "}
          <span className="figures">{formatPrice(compareAt - price)}</span>
        </p>
      )}
    </div>
  );
}

export default Price;
