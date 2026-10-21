import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { usePageMeta } from "../../hooks/usePageMeta";

/** Title row of an admin page: optional back link, title, actions. */
function AdminPage({
  title,
  description,
  actions,
  back,
  tabs,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  tabs?: ReactNode;
  children: ReactNode;
}) {
  usePageMeta({
    title: typeof title === "string" ? `${title} · Admin` : "Admin",
    noindex: true,
  });
  return (
    <div className="mx-auto max-w-6xl">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex min-h-11 items-center gap-1.5 type-nav link"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="type-h2 text-ink">{title}</h1>
          {description && (
            <p className="mt-1 type-body text-soft-ink">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {tabs && <div className="mt-5">{tabs}</div>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default AdminPage;
