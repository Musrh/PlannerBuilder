// Page affichée après un paiement Stripe réussi (adresse : ?payment=success).
// Elle ne dépend ni du routeur ni de la connexion de l’utilisateur.

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#F7F5EF',
    color: '#263326',
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    lineHeight: 1.5,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    padding: '40px 28px',
    textAlign: 'center',
    background: '#fff',
    border: '1px solid #dfe6dc',
    borderRadius: 18,
    boxShadow: '0 8px 30px rgba(38, 59, 43, 0.08)',
  },
  brand: {
    margin: '0 0 24px',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#263b2b',
  },
  check: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    marginBottom: 20,
    borderRadius: '50%',
    background: '#718B70',
    color: '#fff',
    fontSize: 36,
    lineHeight: 1,
  },
  title: { margin: '0 0 12px', fontSize: 24 },
  text: { margin: '0 0 12px', color: '#667064' },
  reference: {
    display: 'inline-block',
    margin: '4px 0 20px',
    padding: '4px 12px',
    fontSize: 13,
    color: '#263b2b',
    background: '#f1f4ee',
    border: '1px solid #dfe6dc',
    borderRadius: 999,
  },
  button: {
    display: 'inline-block',
    marginTop: 12,
    padding: '12px 24px',
    borderRadius: 10,
    background: '#718B70',
    color: '#fff',
    fontWeight: 700,
    textDecoration: 'none',
  },
}

function PaymentSuccess({ sessionId }) {
  const reference = sessionId ? String(sessionId).slice(-8).toUpperCase() : ''

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.brand}>PlannerBuilder</p>

        <div style={styles.check} aria-hidden="true">✓</div>

        <h1 style={styles.title}>Paiement confirmé</h1>

        <p style={styles.text}>
          Merci pour votre confiance ! Votre paiement a bien été effectué.
        </p>

        <p style={styles.text}>
          L’activation de PlannerBuilder Pro peut prendre quelques instants.
          Si besoin, rechargez la page d’accueil pour voir votre accès à jour.
        </p>

        {reference && <span style={styles.reference}>Référence : {reference}</span>}

        <div>
          {/* Même page sans paramètres = accueil de l’application */}
          <a href={window.location.pathname} style={styles.button}>
            Retourner à l’accueil
          </a>
        </div>
      </section>
    </main>
  )
}

export default PaymentSuccess
