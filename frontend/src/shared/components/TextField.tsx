import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} className={className} {...props} />
      {error ? <small className="field-error">{error}</small> : null}
      {!error && hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}
