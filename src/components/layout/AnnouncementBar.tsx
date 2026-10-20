import { Link } from "react-router";
import { useShopSettings } from "../../services/settings";

/**
 * Announcement bar (brand doc section 6): Night Plum, Warm Linen text, 13px,
 * 32px on phones and 36px on desktop. Text and link are edited in admin.
 */
function AnnouncementBar() {
  const { settings } = useShopSettings();
  if (!settings.announcement_enabled || !settings.announcement_text.trim()) {
    return null;
  }
  const text = settings.announcement_text.trim();
  const link = settings.announcement_link?.trim();
  const internal = link?.startsWith("/");

  return (
    <div className="surface-dark bg-night-plum text-linen">
      <div className="container-page flex min-h-8 items-center justify-center py-1.5 text-center text-[13px] leading-[18px] lg:min-h-9">
        {link ? (
          internal ? (
            <Link
              to={link}
              className="underline decoration-linen/40 underline-offset-4 hover:decoration-lamp-glow"
            >
              {text}
            </Link>
          ) : (
            <a
              href={link}
              className="underline decoration-linen/40 underline-offset-4 hover:decoration-lamp-glow"
            >
              {text}
            </a>
          )
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  );
}

export default AnnouncementBar;
