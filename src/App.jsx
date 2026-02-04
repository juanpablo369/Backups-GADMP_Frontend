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

// --- LÓGICA DE LOGOUT ---
  const handleLogout = () => {
  localStorage.removeItem('userToken'); // Borra el token del navegador
  setToken(null);
  setIsAuthenticated(false);
  setAllFiles([]); // Limpia los datos por seguridad
  setSelectedFolder(null);
};

  // --- CARGA DE DATOS PROTEGIDA ---
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
    .finally(() => setIsLoading(false)); // Aquí se cierra todo correctamente
  } else {
    setIsLoading(false);
  }
}, [token]);




  // --- FILTRADO DE CARPETAS ---
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

  // --- FUNCIONES DE DESCARGA Y COPIA ---
  const getDownloadLink = async (key) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/download?key=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data.downloadUrl;
    } catch (error) {
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
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // --- COLUMNAS TABLA ---
  const columns = [
    { name: 'Archivo', selector: row => row.shortName, sortable: true, grow: 2, cell: row => (
      <span onClick={() => handleDownload(row.name)} className="file-link">{row.shortName}</span>
    )},
    { name: 'Tamaño (MB)', selector: row => parseFloat(row.sizeMB), sortable: true, width: '130px' },
    { name: 'Fecha', selector: row => row.lastModified, sortable: true, width: '200px', format: row => new Date(row.lastModified).toLocaleString() },
    { name: 'Acciones', width: '120px', cell: row => (
      <div className="action-buttons">
        <button className="icon-btn download" onClick={() => handleDownload(row.name)}><Download size={20} /></button>
        <button className="icon-btn link" onClick={() => handleCopyLink(row.name)}>
          {copiedKey === row.name ? <Check size={20} color="#28a745" /> : <LinkIcon size={20} />}
        </button>
      </div>
    )},
  ];

  // --- ESTILOS SELECT ---
  const customSelectStyles = {
    control: (base) => ({ ...base, backgroundColor: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#fff' : '#333', borderColor: darkMode ? '#374151' : '#e5e7eb' }),
    menu: (base) => ({ ...base, backgroundColor: darkMode ? '#1f2937' : '#fff', zIndex: 9999 }),
    option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? (darkMode ? '#374151' : '#f3f4f6') : 'transparent', color: darkMode ? '#fff' : '#333' }),
    singleValue: (base) => ({ ...base, color: darkMode ? '#fff' : '#333' }),
  };return (
  <div className={`app-wrapper ${darkMode ? 'dark' : ''}`}>
    
    {/* 1. NAVBAR (Siempre visible) */}
    <nav className="navbar">
      <div className="nav-container">
        <span className="nav-title">SISTEMA DE BACKUPS GADMP</span>
        <div className="nav-actions">
          <button className="theme-toggle-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} color="#4b5563" />}
          </button>
          {isAuthenticated && (
            <button className="logout-btn" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </nav>

    {/* CONTROL DE CARGA PARA EVITAR PARPADEO */}
    {isLoading ? (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    ) : (
      <>
        {/* 2. MODAL DE BLOQUEO (Solo si no está autenticado) */}
        {!isAuthenticated && (
          <div className="modal-overlay">
            <div className="login-card">
              <h2>Acceso Restringido</h2>
              <p>Inicie sesión para gestionar los backups.</p>
              <input 
                type="text" 
                placeholder="Usuario" 
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
              <button className="login-btn" onClick={handleLogin}>Entrar</button>
            </div>
          </div>
        )}

        {/* 3. CONTENIDO PRINCIPAL (Con Blur si no hay sesión) */}
        <div className={`main-content ${!isAuthenticated ? 'blur-active' : ''}`}>
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
      </>
    )}
  </div>
);
}

export default App;