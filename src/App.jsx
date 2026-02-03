import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [groups, setGroups] = useState({});
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/backups`)
      .then(res => res.json())
      .then(data => {
        const grouped = {};

        data.forEach(item => {
          const parts = item.name.split('/');
          const parent = parts[2]; // bd/sqlserver/RENTAS_FILE WEB
          const fileName = parts.slice(3).join('/');

          if (!grouped[parent]) grouped[parent] = [];
          grouped[parent].push({ ...item, shortName: fileName });
        });

        setGroups(grouped);
      });
  }, []);

  const toggle = key => {
    setOpen(open === key ? null : key);
  };

  return (
    <div className="container">
      <h1>Backups en AWS S3</h1>

      {Object.entries(groups).map(([group, files]) => (
        <div className="accordion" key={group}>
          <div className="accordion-header" onClick={() => toggle(group)}>
            <span>{group}</span>
            <span className={`arrow ${open === group ? 'open' : ''}`}>▾</span>
          </div>

          <div className={`accordion-body ${open === group ? 'show' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Tamaño (MB)</th>
                  <th>Última modificación</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={i}>
                    <td className="file-name">{f.shortName}</td>
                    <td>{f.sizeMB}</td>
                    <td>{new Date(f.lastModified).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
