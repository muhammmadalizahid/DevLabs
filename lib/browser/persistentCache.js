'use client'

const DB_NAME = 'devlab-browser-cache'
const STORE_NAME = 'entries'
const DB_VERSION = 1
const MAX_ENTRIES = 80

let openPromise = null

function hasIndexedDb() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openDb() {
  if (!hasIndexedDb()) return Promise.resolve(null)
  if (openPromise) return openPromise

  openPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch(() => null)

  return openPromise
}

async function withStore(mode, run) {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const result = run(store, resolve, reject)
    tx.onerror = () => reject(tx.error)
    if (typeof result === 'undefined') return
  })
}

async function pruneOldEntries() {
  const db = await openDb()
  if (!db) return
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('updatedAt')
    const all = []
    index.openCursor().onsuccess = (event) => {
      const cursor = event.target.result
      if (!cursor) {
        const overflow = Math.max(0, all.length - MAX_ENTRIES)
        for (let i = 0; i < overflow; i++) store.delete(all[i].key)
        resolve()
        return
      }
      all.push(cursor.value)
      cursor.continue()
    }
    tx.onerror = () => reject(tx.error)
  }).catch(() => {})
}

export async function getPersistentCache(key) {
  if (!key) return null
  try {
    const entry = await withStore('readonly', (store, resolve) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await deletePersistentCache(key)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

export async function setPersistentCache(key, value, ttlMs) {
  if (!key) return
  const expiresAt = ttlMs ? Date.now() + ttlMs : null
  try {
    await withStore('readwrite', (store, resolve) => {
      store.put({ key, value, expiresAt, updatedAt: Date.now() })
      resolve(true)
    })
    await pruneOldEntries()
  } catch {}
}

export async function deletePersistentCache(key) {
  if (!key) return
  try {
    await withStore('readwrite', (store, resolve) => {
      store.delete(key)
      resolve(true)
    })
  } catch {}
}

