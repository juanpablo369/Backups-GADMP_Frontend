import { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import Select from 'react-select';
import { Download, Link as LinkIcon, Check, Sun, Moon, Folder, File, ArrowLeft } from 'lucide-react';
import './App.css';

function App() {
  const [allFiles, setAllFiles] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [currentPath, setCurrentPath] = useState([]); 
  const [filteredData, setFilteredData] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [filterText, setFilterText] = useState('');

  // --- ESTADOS DE AUTENTICACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('userToken'));
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);

  // --- DARK MODE ---
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- LÓGICA DE LOGIN ---
  const handleLogin = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('userToken', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
      } else {
        alert("Usuario o clave incorrecta");
      }
    } catch (err) {
      alert("Error al conectar con el servidor de login");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setToken(null);
    setIsAuthenticated(false);
    setAllFiles([]);
    setSelectedFolder(null);
    setCurrentPath([]);
  };

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (token) {
      setIsLoading(true);
      fetch(`${import.meta.env.VITE_API_URL}/backups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            setIsAuthenticated(false);
            localStorage.removeItem('userToken');
            return [];
          }
          setIsAuthenticated(true);
          return res.json();
        })
        .then(data => {
          setAllFiles(data);
          const folders = [...new Set(data.map(item => item.name.split('/')[2]))];
          setOptions(folders.map(f => ({ value: f, label: f })));
        })
        .catch(err => console.error("Error:", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // --- LÓGICA DE NAVEGACIÓN Y FILTRADO ---
  useEffect(() => {
    if (selectedFolder) {
      const dbFiles = allFiles.filter(f => f.name.split('/')[2] === selectedFolder.value);
      const itemsMap = new Map();

      dbFiles.forEach(file => {
        const parts = file.name.split('/').slice(3);
        const isInCurrentPath = currentPath.every((part, idx) => parts[idx] === part);

        if (isInCurrentPath) {
          const relativeParts = parts.slice(currentPath.length);
          const currentName = relativeParts[0];

          if (relativeParts.length > 1) {
            if (!itemsMap.has(currentName)) {
              itemsMap.set(currentName, {
                type: 'folder',
                name: currentName,
                shortName: currentName,
                sizeMB: '--',
                lastModified: null
              });
            }
          } else if (currentName) {
            itemsMap.set(currentName, {
              type: 'file',
              ...file,
              shortName: currentName
            });
          }
        }
      });
      setFilteredData(Array.from(itemsMap.values()));
    } else {
      setFilteredData([]);
      setCurrentPath([]);
    }
  }, [selectedFolder, currentPath, allFiles]);

  // --- LÓGICA DE BÚSQUEDA ---
  const itemsToDisplay = filteredData.filter(item =>
    item.shortName && item.shortName.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleFolderClick = (folderName) => {
    setFilterText(''); 
    setCurrentPath([...currentPath, folderName]);
  };

  const goBack = () => {
    setFilterText('');
    setCurrentPath(currentPath.slice(0, -1));
  };

  // --- FUNCIONES DE ACCIÓN ---
  const getDownloadLink = async (key) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/download?key=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data.downloadUrl;
    } catch (error) { return null; }
  };

  const handleDownload = async (key) => {
    const url = await getDownloadLink(key);
    if (url) window.open(url, '_blank');
  };

  const handleCopyLink = async (key) => {
    const url = await getDownloadLink(key);
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // --- COLUMNAS ---
  const columns = [
    {
      name: 'Nombre',
      sortable: true,
      grow: 2,
      cell: row => (
        <div
          className={`file-item ${row.type}`}
          onClick={() => row.type === 'folder' ? handleFolderClick(row.name) : handleDownload(row.name)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
        >
          {row.type === 'folder' ? <Folder size={18} color="#eab308" /> : <File size={18} color="#6b7280" />}
          <span className={row.type === 'file' ? 'file-link' : ''}>{row.shortName}</span>
        </div>
      )
    },
    { name: 'Tamaño (MB)', selector: row => row.sizeMB, sortable: true, width: '130px' },
    {
      name: 'Fecha',
      selector: row => row.lastModified,
      sortable: true,
      width: '200px',
      format: row => row.lastModified ? new Date(row.lastModified).toLocaleString() : '--'
    },
    {
      name: 'Acciones',
      width: '120px',
      cell: row => row.type === 'file' ? (
        <div className="action-buttons">
          <button className="icon-btn download" onClick={(e) => { e.stopPropagation(); handleDownload(row.name); }}><Download size={18} /></button>
          <button className="icon-btn link" onClick={(e) => { e.stopPropagation(); handleCopyLink(row.name); }}>
            {copiedKey === row.name ? <Check size={18} color="#28a745" /> : <LinkIcon size={18} />}
          </button>
        </div>
      ) : null
    },
  ];

  const customSelectStyles = {
    control: (base) => ({ ...base, backgroundColor: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#fff' : '#333', borderColor: darkMode ? '#374151' : '#e5e7eb' }),
    menu: (base) => ({ ...base, backgroundColor: darkMode ? '#1f2937' : '#fff', zIndex: 9999 }),
    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? (darkMode ? '#374151' : '#f3f4f6') : 'transparent', color: darkMode ? '#fff' : '#333' }),
    singleValue: (base) => ({ ...base, color: darkMode ? '#fff' : '#333' }),
  };

  return (
    <div className={`app-wrapper ${darkMode ? 'dark' : ''}`}>
      <nav className="navbar">
        <div className="nav-container">
          <span className="nav-title">SISTEMA DE BACKUPS GADMP</span>
          <div className="nav-actions">
            <button className="theme-toggle-btn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#4b5563" />}
            </button>
            {isAuthenticated && <button className="logout-btn" onClick={handleLogout}>Cerrar Sesión</button>}
          </div>
        </div>
      </nav>

      {isLoading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <>
          {!isAuthenticated && (
            <div className="modal-overlay">
              <div className="login-card">
                <h2>Acceso Restringido</h2>
                <input type="text" placeholder="Usuario" onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} />
                <input type="password" placeholder="Contraseña" onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} />
                <button className="login-btn" onClick={handleLogin}>Entrar</button>
              </div>
            </div>
          )}

          <div className={`main-content ${!isAuthenticated ? 'blur-active' : ''}`}>
            <div className="container">
              <div className="selector-container">
                <label className="label-select">Base de Datos:</label>
                <Select
                  options={options}
                  onChange={(val) => { setSelectedFolder(val); setCurrentPath([]); setFilterText(''); }}
                  placeholder="Seleccione BD..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              {selectedFolder && (
                <>
                  <div className="breadcrumb-nav">
                    <button
                      className="back-icon-btn"
                      onClick={goBack}
                      disabled={currentPath.length === 0}
                      title="Volver"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <span className="current-path">
                      {selectedFolder.label} {currentPath.length > 0 && ' / ' + currentPath.join(' / ')}
                    </span>
                  </div>

                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Filtrar archivos..."
                      className="search-input"
                      value={filterText}
                      onChange={e => setFilterText(e.target.value)}
                    />
                  </div>

                  <div className="table-container">
                    <DataTable
                      columns={columns}
                      data={itemsToDisplay}
                      pagination
                      highlightOnHover
                      theme={darkMode ? 'dark' : 'default'}
                      noDataComponent={<div className="empty-msg">{filterText ? 'No hay coincidencias' : 'Carpeta vacía'}</div>}
                    />
                  </div>
                </>
              )}
              
              {!selectedFolder && (
                <div className="welcome-msg">Seleccione una base de datos para explorar.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;