import { useEffect, useState } from 'react';
import { DataMeta } from '../types/etablissement';
import { fetchDataMeta } from '../dataFetcher';

/** Sources et fraîcheur des données (null tant qu'elles ne sont pas chargées ou en cas d'échec) */
export const useDataMeta = (): DataMeta | null => {
  const [meta, setMeta] = useState<DataMeta | null>(null);

  useEffect(() => {
    let active = true;
    fetchDataMeta()
      .then((m) => {
        if (active) setMeta(m);
      })
      .catch(() => {
        // sans métadonnées, les sources s'affichent sans date ni année
      });
    return () => {
      active = false;
    };
  }, []);

  return meta;
};
