import { Marker } from 'react-leaflet';
import { Etablissement } from '../types/etablissement';

interface EtablissementMarkersProps {
  etablissements: Etablissement[];
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

const EtablissementMarkers: React.FC<EtablissementMarkersProps> = ({
  etablissements,
  onHover,
  onSelect,
}) => {
  return (
    <>
      {etablissements.map((etablissement) => {
        const etabId = etablissement.uai || `${etablissement.coordonnees.lat},${etablissement.coordonnees.lon}`;
        return (
          <Marker
            key={etabId}
            position={[etablissement.coordonnees.lat, etablissement.coordonnees.lon]}
            title={etablissement.uo_lib}
            alt={etablissement.uo_lib}
            eventHandlers={{
              mouseover: () => onHover(etabId),
              mouseout: () => onHover(null),
              click: () => onSelect(etabId),
            }}
          />
        );
      })}
    </>
  );
};

export default EtablissementMarkers;
