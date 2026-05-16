// IndexedDB Database using Dexie.js for local storage
import Dexie from 'dexie';

const db = new Dexie('InvestIQDatabase');

db.version(1).stores({
  watchlists: '++id, name, createdAt',
  watchlistItems: '++id, watchlistId, symbol, addedAt',
  alerts: '++id, symbol, type, targetPrice, direction, active, createdAt, triggeredAt',
  sectorAlerts: '++id, sector, type, threshold, direction, active, createdAt, triggeredAt',
  updates: '++id, type, symbol, sector, title, content, timestamp',
  newsCache: '++id, source, title, url, publishedAt, symbols, sectors, savedAt',
  preferences: 'key, value',
  stockCache: 'symbol, data, updatedAt'
});

// Watchlist operations
export async function createWatchlist(name) {
  return db.watchlists.add({ name, createdAt: new Date().toISOString() });
}

export async function getWatchlists() {
  return db.watchlists.toArray();
}

export async function deleteWatchlist(id) {
  await db.watchlistItems.where('watchlistId').equals(id).delete();
  return db.watchlists.delete(id);
}

export async function addToWatchlist(watchlistId, symbol) {
  const exists = await db.watchlistItems.where({ watchlistId, symbol }).first();
  if (exists) return exists.id;
  return db.watchlistItems.add({ watchlistId, symbol, addedAt: new Date().toISOString() });
}

export async function removeFromWatchlist(watchlistId, symbol) {
  return db.watchlistItems.where({ watchlistId, symbol }).delete();
}

export async function getWatchlistItems(watchlistId) {
  return db.watchlistItems.where('watchlistId').equals(watchlistId).toArray();
}

// Alert operations
export async function createAlert(alert) {
  return db.alerts.add({ ...alert, active: true, createdAt: new Date().toISOString(), triggeredAt: null });
}

export async function createSectorAlert(alert) {
  return db.sectorAlerts.add({ ...alert, active: true, createdAt: new Date().toISOString(), triggeredAt: null });
}

export async function getAlerts() {
  return db.alerts.toArray();
}

export async function getSectorAlerts() {
  return db.sectorAlerts.toArray();
}

export async function getActiveAlerts() {
  return db.alerts.where('active').equals(1).toArray();
}

export async function triggerAlert(id) {
  return db.alerts.update(id, { active: false, triggeredAt: new Date().toISOString() });
}

export async function deleteAlert(id) {
  return db.alerts.delete(id);
}

export async function deleteSectorAlert(id) {
  return db.sectorAlerts.delete(id);
}

// Updates / History
export async function saveUpdate(update) {
  return db.updates.add({ ...update, timestamp: new Date().toISOString() });
}

export async function getUpdates(limit = 100) {
  return db.updates.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function searchUpdates(query) {
  const all = await db.updates.toArray();
  const q = query.toLowerCase();
  return all.filter(u => u.title?.toLowerCase().includes(q) || u.content?.toLowerCase().includes(q) || u.symbol?.toLowerCase().includes(q));
}

// News Cache
export async function saveNews(newsItems) {
  const items = newsItems.map(n => ({ ...n, savedAt: new Date().toISOString() }));
  return db.newsCache.bulkAdd(items).catch(() => {});
}

export async function getStoredNews(limit = 50) {
  return db.newsCache.orderBy('savedAt').reverse().limit(limit).toArray();
}

// Preferences
export async function setPreference(key, value) {
  return db.preferences.put({ key, value });
}

export async function getPreference(key) {
  const pref = await db.preferences.get(key);
  return pref?.value;
}

// Cleanup old data (>7 days)
export async function cleanupOldData() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.stockCache.where('updatedAt').below(cutoff).delete();
  await db.newsCache.where('savedAt').below(cutoff).delete();
}

export default db;
