import { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import Select from 'react-select';
import { Download, Link as LinkIcon, Check, Sun, Moon } from 'lucide-react';
import './App.css';

function App() {
  const [allFiles, setAllFiles] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/backups`)
      .then(res => res.json())
      .then(data => {
        setAllFiles(data);
        const folders = [...new Set(data.map(item => item.name.split('/')[2]))];
        const selectOptions = folders.map(f => ({ value: f, label: f }));
        setOptions(selectOptions);
      })
      .catch(err => console.error("Error al cargar datos:", err));
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      const filtered = allFiles
        .filter(f => f.name.split('/')[2] === selectedFolder.value)
        .map(f => ({
          ...f,
          shortName: f.name.split('/').slice(3).join('/')
        }));
      setFilteredData(filtered);
    }
  }, [selectedFolder, allFiles]);

  const getDownloadLink = async (key) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/download?key=${encodeURIComponent(key)}`);
      const data = await response.json();
      return data.downloadUrl;
    } catch (error) {
      alert("Error al conectar con el servidor");
      return null;
    }
  };

  const handleDownload = async (key) => {
    const url = await getDownloadLink(key);
    if (url) window.open(url, '_blank');
  };

  const handleCopyLink = async (key) => {
    const url = await getDownloadLink(key);
    if (url) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) { console.error(err); }
        document.body.removeChild(textArea);
      }
    }
  };

  const columns = [
    {
      name: 'Archivo',
      selector: row => row.shortName,
      sortable: true,
      grow: 2,
      cell: row => (
        <span onClick={() => handleDownload(row.name)} className="file-link">
          {row.shortName}
        </span>
      ),
    },
    {
      name: 'Tamaño (MB)',
      selector: row => parseFloat(row.sizeMB),
      sortable: true,
      width: '130px'
    },
    {
      name: 'Fecha',
      selector: row => row.lastModified,
      sortable: true,
      width: '200px',
      format: row => new Date(row.lastModified).toLocaleString(),
    },
    {
      name: 'Acciones',
      width: '120px',
      cell: row => (
        <div className="action-buttons">
          <button className="icon-btn download" onClick={() => handleDownload(row.name)} title="Descargar">
            <Download size={20} />
          </button>
          <button className="icon-btn link" onClick={() => handleCopyLink(row.name)} title="Copiar enlace">
            {copiedKey === row.name ? <Check size={20} color="#28a745" /> : <LinkIcon size={20} />}
          </button>
        </div>
      ),
    },
  ];

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#374151' : '#fff',
      borderColor: darkMode ? '#4b5563' : '#e5e7eb',
      color: darkMode ? '#fff' : '#333'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: darkMode ? '#374151' : '#fff',
      zIndex: 9999
    }),
    option: (base, { isFocused }) => ({
      ...base,
      backgroundColor: isFocused ? (darkMode ? '#4b5563' : '#f3f4f6') : 'transparent',
      color: darkMode ? '#fff' : '#333'
    }),
    singleValue: (base) => ({
      ...base,
      color: darkMode ? '#fff' : '#333'
    }),
    input: (base) => ({ ...base, color: darkMode ? '#fff' : '#333' }),
    placeholder: (base) => ({ ...base, color: darkMode ? '#9ca3af' : '#6b7280' })
  };

  return (
    <div className={`app-wrapper ${darkMode ? 'dark' : ''}`}>
      {/* NAVBAR AGREGADO */}
      <nav className="navbar">
        <div className="nav-container">
          <span className="nav-title">SISTEMA DE BACKUPS GADMP</span>
          <button className="theme-toggle-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#4b5563" />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="selector-container">
          <label className="label-select">Seleccione una Carpeta:</label>
          <Select
            options={options}
            onChange={setSelectedFolder}
            placeholder="Buscar carpeta..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="table-container">
          {selectedFolder ? (
            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              theme={darkMode ? 'dark' : 'default'}
              noDataComponent={<div className="empty-msg">No hay archivos en esta carpeta</div>}
            />
          ) : (
            <div className="welcome-msg">Seleccione una carpeta para visualizar los backups.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;