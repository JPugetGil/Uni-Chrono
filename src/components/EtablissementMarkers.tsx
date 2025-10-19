import { Marker } from 'react-leaflet';
import { Etablissement, getEtablissementName } from '../types/etablissement';

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
      {etablissements
        .filter(etablissement =>
          etablissement.coordonnees &&
          etablissement.coordonnees.lat !== undefined &&
          etablissement.coordonnees.lon !== undefined
        )
        .map((etablissement) => {
          const etabId = etablissement.uai || `${etablissement.coordonnees.lat},${etablissement.coordonnees.lon}`;
          const title = getEtablissementName(etablissement);
          return (
            <Marker
              key={etabId}
              position={[etablissement.coordonnees.lat, etablissement.coordonnees.lon]}
              title={title}
              alt={title}
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
