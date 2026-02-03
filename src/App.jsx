import { useEffect, useState } from 'react';

function App() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/backups')
      .then(res => res.json())
      .then(data => setFiles(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Backups en AWS</h2>

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Tamaño (MB)</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, i) => (
            <tr key={i}>
              <td>{f.name}</td>
              <td>{f.sizeMB}</td>
              <td>{new Date(f.lastModified).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
