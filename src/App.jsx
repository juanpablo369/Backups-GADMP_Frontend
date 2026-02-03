import { useEffect, useState, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import Select from 'react-select';
import './App.css';

function App() {
  const [allFiles, setAllFiles] = useState([]); // Todos los archivos planos
  const [options, setOptions] = useState([]);   // Opciones para el Select
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/backups`)
      .then(res => res.json())
      .then(data => {
        setAllFiles(data);

        // Extraer carpetas únicas para el Select
        const folders = [...new Set(data.map(item => item.name.split('/')[2]))];
        const selectOptions = folders.map(f => ({ value: f, label: f }));
        setOptions(selectOptions);
      });
  }, []);

  // Filtrar datos cuando cambie la selección
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

  const handleDownload = async (key) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/download?key=${encodeURIComponent(key)}`);
      const data = await response.json();
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
    } catch (error) {
      alert("Error al conectar con el servidor");
    }
  };

  // Definición de columnas para la DataTable
  const columns = [
    {
      name: 'Archivo',
      selector: row => row.shortName,
      sortable: true,
      cell: row => (
        <span 
          onClick={() => handleDownload(row.name)} 
          style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {row.shortName}
        </span>
      ),
    },
    {
      name: 'Tamaño (MB)',
      selector: row => parseFloat(row.sizeMB),
      sortable: true,
      width: '150px'
    },
    {
      name: 'Fecha',
      selector: row => row.lastModified,
      sortable: true,
      format: row => new Date(row.lastModified).toLocaleString(),
    },
    {
      name: 'Acción',
      cell: row => (
        <button className="btn-download" onClick={() => handleDownload(row.name)}>
          Descargar
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  // Define este objeto fuera del componente App o antes del return
const customSelectStyles = {
  option: (provided) => ({
    ...provided,
    color: '#333333', // Texto de las opciones en gris oscuro
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#333333', // Texto de la opción seleccionada
  }),
  control: (provided) => ({
    ...provided,
    color: '#333333',
  })
};

 

  return (
    <div className="container">
      <h1>Gestor de Backups GADMP</h1>
      
      <div className="selector-container">
        <label>Seleccione una Carpeta:</label>
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
            responsive
            noDataComponent="No hay archivos en esta carpeta"
          />
        ) : (
          <div className="welcome-msg">Por favor, seleccione una carpeta para ver los archivos.</div>
        )}
      </div>
    </div>
  );
}



export default App;