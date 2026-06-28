interface LoadingStateProps {
  label?: string;
  fullPage?: boolean;
}

export function LoadingState({
  label = "Chargement…",
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div className={fullPage ? "state state-full" : "state"} role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
