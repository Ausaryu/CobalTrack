import { useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({
  label,
  options,
  placeholder,
  id,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <select id={inputId} {...props}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
