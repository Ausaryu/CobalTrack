export function StatsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Analyse</p>
          <h1>Statistiques</h1>
          <p className="muted">Comprenez votre progression dans le temps</p>
        </div>
      </header>

      <section className="content-panel placeholder-panel">
        <span className="placeholder-icon" aria-hidden="true">↗</span>
        <h2>Progression par exercice</h2>
        <p>
          Les vues détaillées par exercice seront ajoutées lors d’une prochaine passe.
          Le résumé hebdomadaire est déjà disponible sur le dashboard.
        </p>
      </section>
    </>
  );
}
