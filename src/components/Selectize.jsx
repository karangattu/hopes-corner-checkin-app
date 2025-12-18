import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export default function Selectize({
  options = [],
  value,
  onChange,
  size = "sm",
  placeholder = "Select…",
  className = "",
  buttonClassName = "",
  searchable = true,
  id,
  displayValue,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const normalized = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt, searchText: opt };
      }
      const label = opt.label ?? String(opt.value ?? "");
      const searchText = opt.searchText || `${label}`;
      return {
        ...opt,
        label,
        searchText,
      };
    });
  }, [options]);

  const selected = useMemo(() => {
    return normalized.find((o) => o.value === value) || null;
  }, [normalized, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) =>
      (o.searchText || o.label || "").toLowerCase().includes(q),
    );
  }, [normalized, query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const sizeClasses = size === "xs" ? "text-xs px-2 py-1" : "text-sm px-3 py-2";

  const listboxId = `${id || "selectize"}-listbox`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`border rounded bg-white flex items-center justify-between gap-2 ${sizeClasses} ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate max-w-[55vw] md:max-w-[20rem]">
          {displayValue || selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 z-[100] bg-white border border-gray-100 rounded-xl shadow-xl w-[70vw] max-w-[90vw] md:w-60 p-2">
          {searchable && (
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                role="searchbox"
                aria-controls={listboxId}
                aria-expanded={open}
                className="w-full border border-gray-200 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:border-blue-300 focus:ring-0 outline-none"
                placeholder="Search…"
                autoFocus
              />
            </div>
          )}
          <div id={listboxId} role="listbox" className="max-h-56 overflow-auto">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange && onChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                role="option"
                aria-selected={opt.value === value}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm transition-colors mb-0.5 last:mb-0 ${
                  opt.value === value
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-gray-500 px-2 py-1">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
