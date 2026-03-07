// Searchable combobox for Administrative Officers (or any person with id, name, school_name).
// Same UX as CPC accounting journal entry account combobox: search, portaled dropdown, responsive panel.
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import "./SearchableAoSelect.css";

const PLACEHOLDER = "Search by name or school...";
const DROPDOWN_Z_INDEX = 100002;
const PREFERRED_MAX_HEIGHT = 220;
const VIEWPORT_PADDING = 12;

function getOptionLabel(item) {
  if (!item) return "";
  const name = item.name ?? "";
  const school = item.school_name ?? "";
  return school ? `${name} · ${school}` : name || "";
}

function filterOptions(options, query) {
  if (!options?.length) return [];
  const q = (query || "").trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (o) =>
      (o.name && String(o.name).toLowerCase().includes(q)) ||
      (o.school_name && String(o.school_name).toLowerCase().includes(q)) ||
      (o.position && String(o.position).toLowerCase().includes(q))
  );
}

export default function SearchableAoSelect({
  options = [],
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = PLACEHOLDER,
  "aria-label": ariaLabel,
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState({
    top: 0,
    left: 0,
    width: 200,
    openUpward: false,
    maxHeight: PREFERRED_MAX_HEIGHT,
    bottom: 0,
  });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.id) === String(value)),
    [options, value]
  );
  const displayText = open ? query : getOptionLabel(selectedOption) || "";

  const filtered = useMemo(
    () => filterOptions(options, open ? query : ""),
    [options, open, query]
  );

  const updateDropdownRect = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const openUpward = spaceBelow < PREFERRED_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      PREFERRED_MAX_HEIGHT,
      openUpward ? spaceAbove - 4 : spaceBelow - 4
    );
    setDropdownRect({
      left: rect.left,
      width: rect.width,
      openUpward,
      maxHeight: Math.max(80, maxHeight),
      top: rect.bottom + 4,
      bottom: window.innerHeight - rect.top + 4,
    });
  }, []);

  useLayoutEffect(() => {
    if (open && inputRef.current) {
      updateDropdownRect();
    }
  }, [open, updateDropdownRect]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateDropdownRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateDropdownRect]);

  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
    }
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector("[data-highlighted='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlightIndex, filtered]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleFocus = () => {
    if (disabled || loading) return;
    setOpen(true);
    if (!query && !selectedOption) setQuery("");
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const selectOption = (option) => {
    onChange(option?.id ?? "");
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlightIndex];
      if (opt) selectOption(opt);
      return;
    }
  };

  const dropdownStyle = {
    position: "fixed",
    top: dropdownRect.openUpward ? "auto" : dropdownRect.top,
    bottom: dropdownRect.openUpward ? dropdownRect.bottom : "auto",
    left: dropdownRect.left,
    width: dropdownRect.width,
    maxHeight: `${dropdownRect.maxHeight}px`,
    overflowY: "auto",
    zIndex: DROPDOWN_Z_INDEX,
  };

  const noMatchStyle = {
    position: "fixed",
    top: dropdownRect.openUpward ? "auto" : dropdownRect.top,
    bottom: dropdownRect.openUpward ? dropdownRect.bottom : "auto",
    left: dropdownRect.left,
    width: dropdownRect.width,
    zIndex: DROPDOWN_Z_INDEX,
  };

  const inputDisabled = disabled || loading;
  const placeholderText = loading ? "Loading…" : placeholder;

  return (
    <>
      <div ref={containerRef} className={`searchable-ao-select-wrap ${className}`}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? "searchable-ao-select-list" : undefined}
          aria-activedescendant={
            open && filtered[highlightIndex]
              ? `searchable-ao-option-${filtered[highlightIndex].id}`
              : undefined
          }
          aria-label={ariaLabel || "Search or select"}
          id={id}
          className="searchable-ao-select-input"
          value={displayText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={inputDisabled}
          placeholder={placeholderText}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 &&
        createPortal(
          <ul
            ref={listRef}
            id="searchable-ao-select-list"
            className="searchable-ao-select-list"
            style={dropdownStyle}
            role="listbox"
          >
            {filtered.map((option, i) => (
              <li
                key={option.id}
                id={`searchable-ao-option-${option.id}`}
                role="option"
                data-highlighted={i === highlightIndex}
                className="searchable-ao-select-option"
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="searchable-ao-select-option-name">{option.name}</span>
                {(option.school_name || option.position) && (
                  <span className="searchable-ao-select-option-meta">
                    {[option.school_name, option.position].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>,
          document.body
        )}
      {open && query.trim() && filtered.length === 0 &&
        createPortal(
          <div className="searchable-ao-select-no-match" style={noMatchStyle} role="status">
            No match for &quot;{query.trim()}&quot;
          </div>,
          document.body
        )}
    </>
  );
}
