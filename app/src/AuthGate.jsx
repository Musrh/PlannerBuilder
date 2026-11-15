/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { isPlannerBuilderAdmin } from './plannerBuilderConfig.js'
import './AuthGate.css'

export const AuthContext = createContext(null)

export function usePlannerBuilderAuth() {
  return useContext(AuthContext)
}

function hasValidProAccess(profileData) {
  return (
    profileData.plan === 'pro' &&
    profileData.paye === true &&
    profileData.active === true &&
    typeof profileData.expiry === 'number' &&
    profileData.expiry > Date.now()
  )
}

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('free')
  const [checking, setChecking] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return

      setChecking(true)
      setProfileError('')
      setUser(null)

      if (!currentUser) {
        setPlan('free')
        setVerificationEmail('')
        setChecking(false)
        return
      }

      if (!currentUser.emailVerified) {
        setVerificationEmail(currentUser.email || '')
        setPlan('free')
        setChecking(false)
        return
      }

      setVerificationEmail('')

      try {
        const profileRef = doc(db, 'users_planner', currentUser.uid)
        const profileSnapshot = await getDoc(profileRef)

        let profileData

        if (profileSnapshot.exists()) {
          // Profil existant : lecture sans modification Firestore.
          const savedProfile = profileSnapshot.data()

          // Compatibilité avec les anciens profils.
          // Les champs absents sont complétés uniquement en mémoire.
          profileData = {
            ...savedProfile,
            email: savedProfile.email || currentUser.email || '',
            plan: savedProfile.plan || 'free',
            paye: savedProfile.paye ?? false,
            active: savedProfile.active ?? false,
            expiry: savedProfile.expiry ?? 0,
          }
        } else {
          // Création d'un profil si le document n'existe pas.
          profileData = {
            email: currentUser.email || '',
            plan: 'free',
            paye: false,
            active: true,
            expiry: 0,
            createdAt: serverTimestamp(),

            subscriptionType: 'free',
            paymentStatus: 'unpaid',
            billingPeriodStart: 0,
            billingPeriodEnd: 0,
            lastPaymentAt: 0,
            paymentProvider: null,
          }

          await setDoc(profileRef, profileData)
        }

        if (!active) return

        setPlan(hasValidProAccess(profileData) ? 'pro' : 'free')
        setUser(currentUser)
      } catch (err) {
        console.error('Erreur profil PlannerBuilder :', err)
        console.error('Code erreur Firebase :', err.code)

        if (!active) return

        setProfileError(
          'Impossible de charger votre profil. Vérifiez votre connexion et les règles Firestore.'
        )
        setPlan('free')
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
  }

  async function handleRegister(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      await setDoc(doc(db, 'users_planner', credential.user.uid), {
        email: credential.user.email || email.trim(),
        plan: 'free',
        paye: false,
        active: true,
        expiry: 0,
        createdAt: serverTimestamp(),

        subscriptionType: 'free',
        paymentStatus: 'unpaid',
        billingPeriodStart: 0,
        billingPeriodEnd: 0,
        lastPaymentAt: 0,
        paymentProvider: null,
      })

      await sendEmailVerification(credential.user)

      setVerificationEmail(credential.user.email || email.trim())
      setMode('verification')
      setNotice('Un e-mail de vérification a été envoyé.')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Erreur inscription :', err)

      if (err.code === 'auth/email-already-in-use') {
        setError('Cette adresse e-mail possède déjà un compte.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresse e-mail invalide.')
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible.')
      } else if (err.code === 'permission-denied') {
        setError(
          "Le compte a été créé, mais Firestore a refusé la création du profil. Vérifiez les règles Firestore."
        )
      } else {
        setError("Impossible de créer le compte ou d'envoyer l'e-mail.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
    } catch (err) {
      console.error('Erreur connexion :', err)

      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Adresse e-mail ou mot de passe incorrect.')
      } else {
        setError('Connexion impossible. Vérifiez vos informations.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerification() {
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const currentUser = auth.currentUser

      if (!currentUser) {
        setError('Reconnectez-vous pour recevoir un nouvel e-mail.')
        return
      }

      await sendEmailVerification(currentUser)
      setNotice('Un nouvel e-mail de vérification a été envoyé.')
    } catch (err) {
      console.error('Erreur envoi vérification :', err)
      setError("Impossible d'envoyer l'e-mail. Réessayez plus tard.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckVerification() {
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const currentUser = auth.currentUser

      if (!currentUser) {
        setError('Votre session a expiré. Reconnectez-vous.')
        setVerificationEmail('')
        setMode('login')
        return
      }

      await currentUser.reload()

      if (auth.currentUser?.emailVerified) {
        window.location.reload()
      } else {
        setError(
          "Votre adresse n'est pas encore vérifiée. Consultez votre boîte e-mail."
        )
      }
    } catch (err) {
      console.error('Erreur vérification :', err)
      setError('Vérification impossible. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!email.trim()) {
      setError('Saisissez votre adresse e-mail.')
      return
    }

    setLoading(true)

    try {
      await sendPasswordResetEmail(auth, email.trim())

      setNotice(
        'Si cette adresse possède un compte, un e-mail de réinitialisation a été envoyé.'
      )
    } catch (err) {
      console.error('Erreur réinitialisation :', err)

      if (err.code === 'auth/invalid-email') {
        setError('Adresse e-mail invalide.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez plus tard.')
      } else {
        setError("Impossible d'envoyer l'e-mail. Réessayez.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth)
      setMode('login')
      setError('')
      setNotice('')
      setPassword('')
    } catch (err) {
      console.error('Erreur déconnexion :', err)
      setError('La déconnexion a échoué. Réessayez.')
    }
  }

  if (checking) {
    return (
      <div className="auth-message">
        Vérification de la session…
      </div>
    )
  }

  if (profileError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Profil indisponible</h1>

          <p className="auth-error" role="alert">
            {profileError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>

          <button type="button" onClick={handleLogout}>
            Se déconnecter
          </button>
        </section>
      </main>
    )
  }

  if (verificationEmail) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">P</div>
          <p className="auth-eyebrow">VÉRIFICATION DU COMPTE</p>

          <h1>Vérifiez votre adresse e-mail</h1>

          <p>Un lien de vérification a été envoyé à :</p>
          <strong>{verificationEmail}</strong>

          <p>
            Consultez votre boîte e-mail, cliquez sur le lien
            de vérification, puis revenez ici.
          </p>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {notice && <p role="status">{notice}</p>}

          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={loading}
          >
            {loading ? 'Vérification…' : "J'ai vérifié mon adresse"}
          </button>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={loading}
          >
            Renvoyer l'e-mail
          </button>

          <button type="button" onClick={handleLogout}>
            Se déconnecter
          </button>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">P</div>
          <p className="auth-eyebrow">VOTRE ATELIER CRÉATIF</p>
          <h1>Bienvenue sur PlannerBuilder</h1>

          {mode === 'login' && (
            <>
              <p>
                Connectez-vous pour accéder à votre espace de création.
              </p>

              <form onSubmit={handleLogin}>
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

                <button type="submit" disabled={loading}>
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => changeMode('register')}
              >
                Créer un compte
              </button>

              <button
                type="button"
                onClick={() => changeMode('reset')}
              >
                Mot de passe oublié ?
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <p>Créez votre compte PlannerBuilder.</p>

              <form onSubmit={handleRegister}>
                <label htmlFor="register-email">Adresse e-mail</label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <label htmlFor="register-password">Mot de passe</label>
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />

                <label htmlFor="register-confirm">
                  Confirmer le mot de passe
                </label>
                <input
                  id="register-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                />

                <button type="submit" disabled={loading}>
                  {loading ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => changeMode('login')}
              >
                Déjà un compte ? Se connecter
              </button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <p>
                Recevez un lien pour choisir un nouveau mot de passe.
              </p>

              <form onSubmit={handlePasswordReset}>
                <label htmlFor="reset-email">Adresse e-mail</label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <button type="submit" disabled={loading}>
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => changeMode('login')}
              >
                Retour à la connexion
              </button>
            </>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {notice && <p role="status">{notice}</p>}
        </section>
      </main>
    )
  }

  const isAdmin = isPlannerBuilderAdmin(user)

  return (
    <AuthContext.Provider value={{ user, plan, isAdmin }}>
      <div className="authenticated-app">
        <div className="auth-session-bar">
          <span>Connecté : {user.email}</span>

          <button type="button" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>

        {children}
      </div>
    </AuthContext.Provider>
  )
}


