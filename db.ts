import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- FIREBASE CONFIGURATION ---
export const firebaseConfig = {
  apiKey: "AIzaSyBRV-i_70Xdk86bNuQQ43jiYkRNCXGvvyo",
  authDomain: "hcoms-221aa.firebaseapp.com",
  databaseURL: "https://hcoms-221aa-default-rtdb.firebaseio.com",
  projectId: "hcoms-221aa",
  storageBucket: "hcoms-221aa.appspot.com",
  messagingSenderId: "817694176734",
  appId: "1:817694176734:web:176bf69333bd7119d3194f",
  measurementId: "G-JB143EY71N"
};

// --- FIREBASE INITIALIZATION ---
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export const database = firebase.database();

// --- INDEXEDDB HELPERS ---
export const itemDb = {
  db: null as any,
  init: function() {
    return new Promise((resolve, reject) => {
      if (this.db) { return resolve(this.db); }
      const request = indexedDB.open('ItemCatalogDB', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'Barcode' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
      request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBRequest).error); reject((event.target as IDBRequest).error); };
    });
  },
  clearAndAddItems: async function(items: any[]) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['items'], 'readwrite');
      const store = transaction.objectStore('items');
      store.clear();
      items.forEach(item => {
          if (item.Barcode) store.add(item);
      });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (event: any) => reject(event.target.error);
    });
  },
  getAllItems: async function() {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['items'], 'readonly');
      const store = transaction.objectStore('items');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  },
  getMetadata: async function() {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('syncInfo');
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  },
  setMetadata: async function(metadata: any) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      store.put({ id: 'syncInfo', ...metadata });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (event: any) => reject(event.target.error);
    });
  }
};

export const stockDb = {
  db: null as any,
  init: function() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      const request = indexedDB.open('StockDataDB', 4);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('stockItems')) {
          db.createObjectStore('stockItems', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  },
  clearAndAddStock: async function(items: any[]) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stockItems'], 'readwrite');
      const store = transaction.objectStore('stockItems');
      store.clear();
      items.forEach(item => store.add(item));
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (event: any) => reject(event.target.error);
    });
  },
  getAllStock: async function() {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['stockItems'], 'readonly');
      const store = transaction.objectStore('stockItems');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  },
  getMetadata: async function() {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get('syncInfo');
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: any) => reject(event.target.error);
    });
  },
  setMetadata: async function(metadata: any) {
    const db: any = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      store.put({ id: 'syncInfo', ...metadata });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (event: any) => reject(event.target.error);
    });
  }
};
