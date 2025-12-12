import React, { useEffect, useMemo, useRef, useState } from "react";

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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        className={`border rounded bg-white flex items-center justify-between gap-2 ${sizeClasses} ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate max-w-[55vw] md:max-w-[20rem]">
          {displayValue || selected?.label || placeholder}
        </span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 z-30 bg-white border rounded shadow w-[70vw] max-w-[90vw] md:w-60 p-2">
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs mb-2"
              placeholder="Search…"
              autoFocus
            />
          )}
          <div className="max-h-56 overflow-auto">
            {filtered.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange && onChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-2 py-1 rounded text-xs md:text-sm hover:bg-blue-50 ${
                  opt.value === value ? "bg-blue-50 font-medium" : ""
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
