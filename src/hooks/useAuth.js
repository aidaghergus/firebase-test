import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [role, setRole] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          setRole(snap.exists() ? snap.data().role : 'user')
        } catch (err) {
          console.error('Failed to fetch user role:', err)
          setRole('user')
        }
        setUser(firebaseUser) // set user only after role is ready
      } else {
        setRole(null)
        setUser(null)
      }
    })
  }, [])

  return { user, role, loading: user === undefined }
}