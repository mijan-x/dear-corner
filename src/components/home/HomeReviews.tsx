import { Link } from "react-router";
import SectionHeading from "../ui/SectionHeading";
import Rating from "../ui/Rating";
import Reveal from "../motion/Reveal";
import { useQuery } from "../../lib/query";
import { routes } from "../../lib/routes";
import { fetchHomeReviews } from "../../services/home";

/**
 * Latest approved reviews from buyers of delivered orders. Rendered only
 * once at least one review is approved; nothing is ever
 * made up to fill it.
 */
function HomeReviews() {
  const { data } = useQuery("home-reviews", fetchHomeReviews);
  if (!data || data.length === 0) return null;

  return (
    <section aria-labelledby="home-reviews" className="container-page">
      <SectionHeading
        id="home-reviews"
        eyebrow="From our customers"
        title="Kind words"
      />
      <ul className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
        {data.map((review, i) => (
          <Reveal
            as="li"
            key={review.id}
            delay={i * 60}
            className="flex flex-col rounded-card border border-sand-line bg-paper p-6"
          >
            <Rating value={review.rating} />
            {review.title && (
              <p className="mt-3 font-semibold text-ink">{review.title}</p>
            )}
            <p className="mt-2 line-clamp-5 type-body text-ink/85">
              {review.body}
            </p>
            <p className="mt-auto pt-4 type-caption text-soft-ink">
              {review.name}
              {review.product && (
                <>
                  {" on "}
                  <Link
                    to={routes.product(review.product.slug)}
                    className="link"
                  >
                    {review.product.name}
                  </Link>
                </>
              )}
            </p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default HomeReviews;
