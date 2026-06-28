import { useId, type TextareaHTMLAttributes } from "react";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextareaField({ label, hint, id, ...props }: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <textarea id={inputId} {...props} />
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}
