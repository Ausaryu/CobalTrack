import { useId, type InputHTMLAttributes } from "react";

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function CheckboxField({ label, id, ...props }: CheckboxFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <label className="checkbox-field" htmlFor={inputId}>
      <input id={inputId} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
