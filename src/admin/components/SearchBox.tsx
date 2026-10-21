import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { controlClasses } from "../../components/ui/fieldStyles";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

/** Search field that reports its value after a short pause. */
function SearchBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 300);
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // Only when the typed text settles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-soft-ink"
      />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={controlClasses({ className: "h-11 pr-3 pl-10" })}
      />
    </label>
  );
}

export default SearchBox;
