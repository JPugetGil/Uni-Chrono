// Classe utilitaire pour stocker et récupérer les isochrones et etablissementsGeoJSON dans le localStorage
import { Isochrone } from './types/isochrone';
import { Etablissement } from './types/etablissement';

type CacheEntry<T> = {
  ts: number; // timestamp en ms
  data: T;
};

class LocalStorageCache {
  static etablissementsKey = 'etablissementsGeoJSON';
  static isochronesKey = 'isochrones';

  // Sauvegarde les établissements dans le localStorage
  static saveEtablissements(data: Etablissement[]) {
    try {
      const entry: CacheEntry<Etablissement[]> = { ts: Date.now(), data };
      localStorage.setItem(this.etablissementsKey, JSON.stringify(entry));
    } catch {
      // Ignore les erreurs de quota ou de sérialisation
    }
  }

  // Récupère les établissements depuis le localStorage
  static loadEtablissements(ttlMs?: number): Etablissement[] | null {
    try {
      const raw = localStorage.getItem(this.etablissementsKey);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<Etablissement[]> | Etablissement[];
      // Compat: si ancien format (tableau direct)
      if (Array.isArray(entry)) return entry as Etablissement[];
      const { ts, data } = entry as CacheEntry<Etablissement[]>;
      if (ttlMs && Date.now() - ts > ttlMs) {
        localStorage.removeItem(this.etablissementsKey);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  // Récupère l'entrée complète (ts + data) pour établissements
  static loadEtablissementsEntry(ttlMs?: number): CacheEntry<Etablissement[]> | null {
    try {
      const raw = localStorage.getItem(this.etablissementsKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry<Etablissement[]> | Etablissement[];
      if (Array.isArray(parsed)) {
        // Ancien format: fabriquer une entrée avec ts courant
        return { ts: Date.now(), data: parsed as Etablissement[] };
      }
      const entry = parsed as CacheEntry<Etablissement[]>;
      if (ttlMs && Date.now() - entry.ts > ttlMs) {
        localStorage.removeItem(this.etablissementsKey);
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  }

  // Sauvegarde les isochrones dans le localStorage
  static saveIsochrones(data: Isochrone[], key?: string) {
    try {
      const k = key ? `${this.isochronesKey}:${key}` : this.isochronesKey;
      const entry: CacheEntry<Isochrone[]> = { ts: Date.now(), data };
      localStorage.setItem(k, JSON.stringify(entry));
    } catch {
      // Ignore les erreurs de quota ou de sérialisation
    }
  }

  // Récupère les isochrones depuis le localStorage
  static loadIsochrones(key?: string, ttlMs?: number): Isochrone[] | null {
    try {
      const k = key ? `${this.isochronesKey}:${key}` : this.isochronesKey;
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<Isochrone[]> | Isochrone[];
      // Compat: si ancien format (tableau direct)
      if (Array.isArray(entry)) return entry as Isochrone[];
      const { ts, data } = entry as CacheEntry<Isochrone[]>;
      if (ttlMs && Date.now() - ts > ttlMs) {
        localStorage.removeItem(k);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  // Récupère l'entrée complète (ts + data) pour isochrones
  static loadIsochronesEntry(key?: string, ttlMs?: number): CacheEntry<Isochrone[]> | null {
    try {
      const k = key ? `${this.isochronesKey}:${key}` : this.isochronesKey;
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry<Isochrone[]> | Isochrone[];
      if (Array.isArray(parsed)) {
        return { ts: Date.now(), data: parsed as Isochrone[] };
      }
      const entry = parsed as CacheEntry<Isochrone[]>;
      if (ttlMs && Date.now() - entry.ts > ttlMs) {
        localStorage.removeItem(k);
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  }

  // Nettoie le cache (optionnel)
  static clear() {
    localStorage.removeItem(this.etablissementsKey);
    // Supprime la clé générique; les clés dérivées ne peuvent être listées sans itérer sur localStorage
    localStorage.removeItem(this.isochronesKey);
  }

  static clearAll() {
    try {
      const etabKey = this.etablissementsKey;
      const isoPrefix = `${this.isochronesKey}`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k === etabKey || k === isoPrefix || k.startsWith(`${isoPrefix}:`)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}

export default LocalStorageCache;