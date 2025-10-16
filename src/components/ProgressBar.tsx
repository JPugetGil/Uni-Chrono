interface ProgressBarProps {
  percent: number;
  resolved: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, resolved, total }) => {
  return (
    <div style={{ width: '100%', margin: '8px 0' }}>
      <div style={{
        background: '#eee',
        borderRadius: 8,
        overflow: 'hidden',
        height: 18,
        position: 'relative',
      }}>
        <div style={{
          width: `${percent}%`,
          background: percent === 100 ? '#4caf50' : '#2196f3',
          height: '100%',
          transition: 'width 0.3s',
        }} />
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#222',
          fontWeight: 500,
          fontSize: 11,
          whiteSpace: 'nowrap',
        }}>
          {resolved === total ? 'All isochrones resolved!' : `Isochrones resolved: ${resolved} / ${total} (${percent}%)`}
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
