
import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyBuiap7vkHi1nsK78hAMZSC4ebm0a3r3_Y',
    authDomain: 'recettes-2c62a.firebaseapp.com',
      databaseURL: 'https://recettes-2c62a-default-rtdb.firebaseio.com',
        projectId: 'recettes-2c62a',
          storageBucket: 'recettes-2c62a.firebasestorage.app',
            messagingSenderId: '384412687224',
              appId: '1:384412687224:web:64485e5af41d8e0c49868d',
                measurementId: 'G-77JB0FD358',
                }

                const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

                export const auth = getAuth(app)
                export const db = getFirestore(app)

                // Analytics est facultatif et peut ne pas être pris en charge
                // dans certains navigateurs ou environnements.
                export let analytics = null

                if (typeof window !== 'undefined') {
                  isSupported()
                      .then((supported) => {
                            if (supported) {
                                    analytics = getAnalytics(app)
                                          }
                                              })
                                                  .catch(() => {
                                                        analytics = null
                                                            })
                                                            }

                                                            export default app
                                                            