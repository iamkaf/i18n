"use client";

import { useEffect } from "react";
import { LocalePicker } from "@/components/atelier/locale-picker";
import { isSupportedLocaleCode, normalizeLocaleCode } from "@/lib/locales";

export function LocaleCombobox({
  value,
  onChange,
  placeholder = "Choose locale",
  allowEmpty = false,
  disabled = false,
  className,
  onValidityChange,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const normalized = normalizeLocaleCode(value);
  const isValid = allowEmpty
    ? normalized.length === 0 || isSupportedLocaleCode(normalized)
    : isSupportedLocaleCode(normalized);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  return (
    <LocalePicker
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowEmpty={allowEmpty}
      disabled={disabled}
      className={className}
    />
  );
}
