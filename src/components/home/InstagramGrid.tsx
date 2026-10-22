import SectionHeading from "../ui/SectionHeading";
import Reveal from "../motion/Reveal";
import { imageUrl } from "../../lib/images";
import type { InstagramPhoto } from "../../services/home";

/**
 * Six photos from the shop's Instagram. Shown only once six photos are set
 * in admin; otherwise the section isn't rendered at all.
 */
function InstagramGrid({
  photos,
  handle,
  profileUrl,
}: {
  photos: InstagramPhoto[];
  handle: string;
  profileUrl: string;
}) {
  if (photos.length < 6) return null;
  const name = handle ? `@${handle.replace(/^@/, "")}` : "Instagram";

  return (
    <section aria-labelledby="home-instagram" className="container-page">
      <SectionHeading
        id="home-instagram"
        eyebrow="Instagram"
        title={`Corners we love, ${name}`}
        link={
          profileUrl ? { to: profileUrl, label: "Follow along" } : undefined
        }
      />
      <ul className="mt-8 grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-4">
        {photos.slice(0, 6).map((photo, i) => {
          const src = imageUrl(photo.image, "site-media");
          const link = photo.link || profileUrl;
          const img = src && (
            <img
              src={src}
              alt={photo.alt}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-control object-cover"
            />
          );
          return (
            <Reveal as="li" key={`${photo.image}-${i}`} delay={i * 40}>
              {link ? (
                <a href={link} target="_blank" rel="noreferrer">
                  {img}
                </a>
              ) : (
                img
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

export default InstagramGrid;
