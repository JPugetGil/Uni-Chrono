import { useEffect } from 'react';
import EtablissementDetails from './EtablissementDetails';
import { Etablissement } from '../types/etablissement';
import { Isochrone } from '../types/isochrone';

interface EtablissementModalProps {
  selectedEtabId: string | null;
  etablissements: Etablissement[];
  isochrones: Isochrone[];
  resolved: number;
  total: number;
  transportMode: 'walking' | 'cycling' | 'driving-traffic' | 'driving';
  timeInMinutes: number;
  onClose: () => void;
}

const EtablissementModal: React.FC<EtablissementModalProps> = ({
  selectedEtabId,
  etablissements,
  isochrones,
  resolved,
  total,
  transportMode,
  timeInMinutes,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!selectedEtabId) return null;

  const etablissement = etablissements.find(
    x => (x.uai || `${x.coordonnees.lat},${x.coordonnees.lon}`) === selectedEtabId
  );

  if (!etablissement) return null;

  const isochrone = isochrones.find(i => i.etablissementId === selectedEtabId);

  return (
    <>
      {/* Overlay pour clic extérieur */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 900,
          background: 'transparent',
        }}
      />

      <EtablissementDetails
        etablissement={etablissement}
        isochrone={isochrone}
        resolved={resolved}
        total={total}
        transportMode={transportMode}
        timeInMinutes={timeInMinutes}
        onClose={onClose}
      />
    </>
  );
};

export default EtablissementModal;
