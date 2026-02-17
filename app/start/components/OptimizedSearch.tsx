/**
 * Componente de búsqueda optimizado con debouncing
 */

"use client";

import React, { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedSearch } from "../hooks/useRealtimeLeads";

interface OptimizedSearchProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  placeholder?: string;
  debounceDelay?: number;
  disabled?: boolean;
  showClear?: boolean;
}

export function OptimizedSearch({
  value,
  onChange,
  onDebouncedChange,
  placeholder = "Buscar...",
  debounceDelay = 300,
  disabled = false,
  showClear = true,
}: OptimizedSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Usar debounce para la búsqueda pesada
  useDebouncedSearch(
    localValue,
    (debouncedValue) => {
      if (onDebouncedChange) {
        onDebouncedChange(debouncedValue);
      }
    },
    debounceDelay
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue); // Actualizar valor local inmediatamente
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    if (onDebouncedChange) {
      onDebouncedChange("");
    }
  }, [onChange, onDebouncedChange]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid rgba(51, 65, 85, 0.5)",
      backgroundColor: "rgba(15, 23, 42, 0.4)",
      backdropFilter: "blur(8px)",
    }}>
      <Search size={18} style={{ color: "rgba(148, 163, 184, 0.7)" }} />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          color: "var(--botz-text)",
          outline: "none",
          fontSize: "14px",
        }}
      />
      {showClear && localValue && (
        <button
          onClick={handleClear}
          disabled={disabled}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(148, 163, 184, 0.7)",
            padding: "4px",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
