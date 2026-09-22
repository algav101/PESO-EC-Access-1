"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Search, Filter } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface MultiSelectFilterProps {
  label: string;
  icon?: React.ReactNode;
  options: (string | MultiSelectOption)[];
  selectedValues: string[]; // empty or ["ALL"] means all selected
  onChange: (values: string[]) => void;
  allLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelectFilter({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  allLabel = "All Selected",
  placeholder = "Filter...",
  className = "",
  disabled = false,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions = useMemo<MultiSelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Check if ALL are selected or none selected (which equals all)
  const isAllSelected =
    selectedValues.length === 0 ||
    selectedValues.includes("ALL") ||
    (selectedValues.length === normalizedOptions.length && normalizedOptions.length > 0);

  // Filtered options based on internal search
  const visibleOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, search]);

  const handleToggleOption = (val: string) => {
    if (val === "ALL") {
      onChange(["ALL"]);
      return;
    }

    let nextSelected: string[];
    if (isAllSelected) {
      // If currently all selected and user clicks one item, select ONLY that item
      nextSelected = [val];
    } else if (selectedValues.includes(val)) {
      nextSelected = selectedValues.filter((v) => v !== val && v !== "ALL");
      if (nextSelected.length === 0) {
        nextSelected = ["ALL"]; // revert to all if none
      }
    } else {
      nextSelected = [...selectedValues.filter((v) => v !== "ALL"), val];
      if (nextSelected.length === normalizedOptions.length) {
        nextSelected = ["ALL"];
      }
    }
    onChange(nextSelected);
  };

  const handleSelectAll = () => {
    onChange(["ALL"]);
  };

  const handleClearAll = () => {
    // If cleared, either empty or default
    onChange([]);
  };

  // Determine button title text
  const displayTitle = useMemo(() => {
    if (isAllSelected) {
      return allLabel;
    }
    if (selectedValues.length === 1) {
      const match = normalizedOptions.find((o) => o.value === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    return `${selectedValues.length} Selected`;
  }, [isAllSelected, selectedValues, allLabel, normalizedOptions]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            {icon || <Filter className="w-3 h-3 text-gov-blue" />}
            <span>{label}</span>
          </span>
          {!isAllSelected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAll();
              }}
              className="text-[9px] text-gov-blue hover:underline font-bold"
            >
              Reset
            </button>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 text-xs border rounded-lg flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-gov-blue/20 ${
          isOpen
            ? "border-gov-blue bg-blue-50/40 text-gov-blue ring-2 ring-gov-blue/20"
            : !isAllSelected
            ? "border-blue-400 bg-blue-50/70 text-slate-900 font-bold"
            : "border-slate-300 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100/80"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center space-x-1.5 truncate pr-2">
          {!isAllSelected && (
            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 animate-pulse" />
          )}
          <span className="truncate">{displayTitle}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 flex-shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-gov-blue" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-100">
          {/* Search bar & quick actions */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 space-y-1.5">
            {normalizedOptions.length > 6 && (
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-gov-blue font-medium"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-gov-blue hover:underline py-0.5"
              >
                Select All ({normalizedOptions.length})
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-rose-600 hover:underline py-0.5"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50 text-xs">
            {visibleOptions.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-slate-400 italic">
                No matching options
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = isAllSelected || selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggleOption(opt.value)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-blue-50/80 text-gov-blue font-bold"
                        : "text-slate-700 hover:bg-slate-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-gov-blue border-gov-blue text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSelected
                            ? "bg-blue-200/70 text-gov-blue font-bold"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer status */}
          <div className="p-1.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500 px-2.5">
            <span>
              {isAllSelected
                ? `All ${normalizedOptions.length} Selected`
                : `${selectedValues.length} of ${normalizedOptions.length} Selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-gov-blue hover:text-gov-light"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
