"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  name: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function SearchableSelect({
  name,
  options,
  placeholder = "Search...",
  defaultValue = "",
  value,
  required,
  className,
  onValueChange,
}: SearchableSelectProps) {
  const isControlled = value !== undefined;
  const defaultOption = options.find((o) => o.value === defaultValue);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState(defaultOption?.label ?? "");
  const [selectedValueState, setSelectedValueState] = React.useState(defaultValue);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedValue = isControlled ? value : selectedValueState;

  React.useEffect(() => {
    if (isControlled) {
      const match = options.find((option) => option.value === value);
      setSearch(match?.label ?? "");
      return;
    }

    const match = options.find((option) => option.value === defaultValue);
    setSelectedValueState(defaultValue);
    setSearch(match?.label ?? "");
  }, [defaultValue, isControlled, options, value]);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Restore display text if user typed something invalid
        if (selectedValue) {
          const match = options.find((o) => o.value === selectedValue);
          setSearch(match?.label ?? "");
        } else {
          setSearch("");
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedValue, options]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={selectedValue} />
      <div className="relative">
        <input
          type="text"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={placeholder}
          value={search}
          required={required && !selectedValue}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isControlled) {
              setSelectedValueState("");
            }
            onValueChange?.("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md">
          {filtered.map((o) => (
            <li
              key={o.value}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground",
                o.value === selectedValue && "bg-accent text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!isControlled) {
                  setSelectedValueState(o.value);
                }
                setSearch(o.label);
                setOpen(false);
                onValueChange?.(o.value);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && search && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          No results found.
        </div>
      )}
    </div>
  );
}
