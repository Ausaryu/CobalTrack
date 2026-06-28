import { useId, type InputHTMLAttributes } from "react";

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

export function NumberField({ label, hint, id, ...props }: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} type="number" inputMode="decimal" {...props} />
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}
