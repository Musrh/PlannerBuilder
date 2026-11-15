import { useEffect, useState } from 'react'
import { usePlannerBuilderAuth } from './AuthGate.jsx'
import './Admin.css'

const API_URL = import.meta.env.VITE_PLANNERBUILDER_API_URL

const DEFAULT_SETTINGS = {
  whop: { enabled: true },
  stripe: {
    enabled: false,
    prices: {
      EUR: { monthly: null, annual: null },
      USD: { monthly: null, annual: null },
    },
  },
  paypal: {
    enabled: false,
    prices: {
      EUR: { monthly: null, annual: null },
      USD: { monthly: null, annual: null },
    },
  },
}

export default function Admin() {
  const { user } = usePlannerBuilderAuth()

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAdminData() {
      setLoading(true)
      setSettingsLoading(true)
      setError('')
      setSettingsError('')

      try {
        if (!API_URL) {
          throw new Error('URL du serveur Railway manquante.')
        }

        const token = await user.getIdToken()

        async function getData(path) {
          const response = await fetch(
            `${API_URL.replace(/\/+$/, '')}${path}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          const result = await response.json()

          if (!response.ok || result.success !== true) {
            throw new Error(result.error || 'Erreur du serveur.')
          }

          return result
        }

        const [dashboard, userList, paymentData] = await Promise.all([
          getData('/api/admin/dashboard'),
          getData(`/api/admin/users?page=${page}&pageSize=25`),
          getData('/api/admin/payment-settings'),
        ])

        if (cancelled) return

        setStats(dashboard.stats)
        setUsers(userList.users || [])
        setPagination(userList.pagination || null)

        setPaymentSettings({
          whop: {
            ...DEFAULT_SETTINGS.whop,
            ...(paymentData.settings?.whop || {}),
          },
          stripe: {
            ...DEFAULT_SETTINGS.stripe,
            ...(paymentData.settings?.stripe || {}),
            prices: {
              EUR: {
                ...DEFAULT_SETTINGS.stripe.prices.EUR,
                ...(paymentData.settings?.stripe?.prices?.EUR || {}),
              },
              USD: {
                ...DEFAULT_SETTINGS.stripe.prices.USD,
                ...(paymentData.settings?.stripe?.prices?.USD || {}),
              },
            },
          },
          paypal: {
            ...DEFAULT_SETTINGS.paypal,
            ...(paymentData.settings?.paypal || {}),
            prices: {
              EUR: {
                ...DEFAULT_SETTINGS.paypal.prices.EUR,
                ...(paymentData.settings?.paypal?.prices?.EUR || {}),
              },
              USD: {
                ...DEFAULT_SETTINGS.paypal.prices.USD,
                ...(paymentData.settings?.paypal?.prices?.USD || {}),
              },
            },
          },
        })
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Impossible de charger les données.')
          setSettingsError(
            err.message || 'Impossible de charger les paramètres de paiement.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setSettingsLoading(false)
        }
      }
    }

    if (user) loadAdminData()

    return () => {
      cancelled = true
    }
  }, [user, page])

  function formatDate(timestamp) {
    if (!timestamp) return '—'

    const date = new Date(timestamp)

    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('fr-FR')
  }

  function updateProvider(provider, enabled) {
    setPaymentSettings((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        enabled,
      },
    }))
    setSettingsMessage('')
  }

  function updatePrice(provider, currency, period, value) {
    setPaymentSettings((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        prices: {
          ...current[provider].prices,
          [currency]: {
            ...current[provider].prices[currency],
            [period]: value === '' ? null : Number(value),
          },
        },
      },
    }))
    setSettingsMessage('')
  }

  async function savePaymentSettings() {
    setSettingsSaving(true)
    setSettingsError('')
    setSettingsMessage('')

    try {
      if (!API_URL) {
        throw new Error('URL du serveur Railway manquante.')
      }

      const token = await user.getIdToken()

      const response = await fetch(
        `${API_URL.replace(/\/+$/, '')}/api/admin/payment-settings`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            settings: paymentSettings,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || result.success !== true) {
        throw new Error(result.error || 'Enregistrement impossible.')
      }

      setSettingsMessage('Configuration enregistrée avec succès.')
    } catch (err) {
      setSettingsError(err.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setSettingsSaving(false)
    }
  }

  function renderProviderPrices(provider, label) {
    const settings = paymentSettings[provider]

    return (
      <article className="admin-payment-card">
        <div className="admin-payment-heading">
          <div>
            <h3>{label}</h3>
            <p>Configuration des tarifs et activation.</p>
          </div>

          <label className="admin-switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                updateProvider(provider, event.target.checked)
              }
            />
            <span>{settings.enabled ? 'Activé' : 'Désactivé'}</span>
          </label>
        </div>

        <div className="admin-prices-grid">
          {['EUR', 'USD'].map((currency) => (
            <div className="admin-price-group" key={currency}>
              <h4>{currency}</h4>

              <label>
                Mensuel
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ex. 2"
                  value={settings.prices[currency].monthly ?? ''}
                  onChange={(event) =>
                    updatePrice(
                      provider,
                      currency,
                      'monthly',
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                Annuel
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Ex. 20"
                  value={settings.prices[currency].annual ?? ''}
                  onChange={(event) =>
                    updatePrice(
                      provider,
                      currency,
                      'annual',
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>

        {settings.enabled && (
          <p className="admin-payment-note">
            Tous les tarifs EUR et USD doivent être renseignés avant
            l'enregistrement.
          </p>
        )}
      </article>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">PLANNERBUILDER</p>
          <h1>Administration</h1>
          <p>Gestion des utilisateurs et des abonnements.</p>
        </div>

        <a href="/" className="admin-back">
          Retour au générateur
        </a>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin-loading">Chargement des données…</p>
      ) : (
        <>
          <section className="admin-stats">
            <article className="admin-card">
              <span>Utilisateurs</span>
              <strong>{stats?.totalUsers ?? 0}</strong>
            </article>

            <article className="admin-card">
              <span>Abonnements Pro actifs</span>
              <strong>{stats?.activePro ?? 0}</strong>
            </article>

            <article className="admin-card">
              <span>Comptes gratuits</span>
              <strong>{stats?.freeUsers ?? 0}</strong>
            </article>

            <article className="admin-card">
              <span>Abonnements Pro expirés</span>
              <strong>{stats?.expiredPro ?? 0}</strong>
            </article>
          </section>

          <section className="admin-users">
            <div className="admin-section-heading">
              <div>
                <h2>Utilisateurs</h2>
                <p>Comptes enregistrés dans PlannerBuilder.</p>
              </div>

              <span>{pagination?.total ?? users.length} comptes</span>
            </div>

            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Plan</th>
                    <th>Statut</th>
                    <th>Paiement</th>
                    <th>Expiration</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => (
                    <tr key={item.uid}>
                      <td>{item.email || item.uid}</td>
                      <td>{item.plan || 'free'}</td>
                      <td>
                        {item.plan === 'pro' && item.active && item.paye
                          ? 'Actif'
                          : 'Gratuit / inactif'}
                      </td>
                      <td>{item.paymentProvider || '—'}</td>
                      <td>{formatDate(item.expiry)}</td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5">Aucun utilisateur trouvé.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Précédent
              </button>

              <span>
                Page {pagination?.page ?? page} / {pagination?.totalPages ?? 1}
              </span>

              <button
                type="button"
                disabled={!pagination || page >= pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Suivant
              </button>
            </div>
          </section>

          <section className="admin-users admin-payment-settings">
            <div className="admin-section-heading">
              <div>
                <h2>Moyens de paiement</h2>
                <p>Activation des prestataires et configuration des tarifs.</p>
              </div>
            </div>

            {settingsLoading ? (
              <p className="admin-loading">Chargement des paramètres…</p>
            ) : (
              <>
                <article className="admin-payment-card">
                  <div className="admin-payment-heading">
                    <div>
                      <h3>Whop</h3>
                      <p>Gestion de l'accès au paiement Whop.</p>
                    </div>

                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={paymentSettings.whop.enabled}
                        onChange={(event) =>
                          updateProvider('whop', event.target.checked)
                        }
                      />
                      <span>
                        {paymentSettings.whop.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </label>
                  </div>
                </article>

                {renderProviderPrices('stripe', 'Stripe')}
                {renderProviderPrices('paypal', 'PayPal')}

                {settingsError && (
                  <div className="admin-error" role="alert">
                    {settingsError}
                  </div>
                )}

                {settingsMessage && (
                  <p className="admin-success" role="status">
                    {settingsMessage}
                  </p>
                )}

                <button
                  type="button"
                  className="admin-save-button"
                  onClick={savePaymentSettings}
                  disabled={settingsSaving}
                >
                  {settingsSaving
                    ? 'Enregistrement…'
                    : 'Enregistrer les paramètres'}
                </button>
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}
