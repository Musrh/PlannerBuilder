
import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase.js'
import './AuthGate.css'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setChecking(false)
    })

    return unsubscribe
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch {
      setError('Connexion impossible. Vérifiez votre e-mail et votre mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth)
    } catch {
      setError('La déconnexion a échoué. Réessayez.')
    }
  }

  if (checking) {
    return <div className="auth-message">Vérification de la session…</div>
  }

  if (!user) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="auth-brand">P</div>
          <p className="auth-eyebrow">VOTRE ATELIER CRÉATIF</p>
          <h1>Bienvenue sur PlannerBuilder</h1>
          <p>Connectez-vous pour accéder à votre espace de création.</p>

          <label htmlFor="auth-email">Adresse e-mail</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="auth-password">Mot de passe</label>
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <div className="authenticated-app">
      <div className="auth-session-bar">
        <span>Connecté : {user.email}</span>
        <button type="button" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>
      {children}
    </div>
  )
}
