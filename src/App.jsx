import React, { useState, useEffect, useMemo } from 'react';
const { ipcRenderer } = window.require('electron');

const App = () => {
  const [configs, setConfigs] = useState([]);
  const [editingConfig, setEditingConfig] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const configs = await ipcRenderer.invoke('load-configs');
      setConfigs(configs);
    } catch (error) {
      console.error('Error loading SSH config:', error);
    }
  };

  const saveConfigs = async (configs) => {
    try {
      const success = await ipcRenderer.invoke('save-configs', configs);
      if (!success) {
        console.error('Failed to save SSH config');
      }
    } catch (error) {
      console.error('Error saving SSH config:', error);
    }
  };

  const handleEdit = (config) => {
    // Inicializa campos opcionais com string vazia se não existirem
    const editConfig = {
      ...config,
      identityFile: config.identityFile || '',
      port: config.port || '',
      forwardAgent: config.forwardAgent || 'no',
      proxyJump: config.proxyJump || ''
    };
    setEditingConfig(editConfig);
    setIsAddingNew(false);
  };

  const handleDelete = async (host) => {
    const newConfigs = configs.filter(c => c.host !== host);
    setConfigs(newConfigs);
    await saveConfigs(newConfigs);
  };

  const handleClone = (config) => {
    const clonedConfig = {
      ...config,
      host: `${config.host}-clone`,
      hostName: config.hostName,
      user: config.user,
      identityFile: config.identityFile,
      port: config.port,
      forwardAgent: config.forwardAgent,
      proxyJump: config.proxyJump
    };
    setEditingConfig(clonedConfig);
    setIsAddingNew(true);
  };

  const handleSave = async (updatedConfig) => {
    // Limpa campos opcionais vazios
    const cleanConfig = {
      ...updatedConfig,
      identityFile: updatedConfig.identityFile?.trim() || undefined,
      port: updatedConfig.port || undefined,
      forwardAgent: updatedConfig.forwardAgent === 'no' ? undefined : updatedConfig.forwardAgent,
      proxyJump: updatedConfig.proxyJump?.trim() || undefined
    };

    // Remove campos com valor 'undefined'
    Object.keys(cleanConfig).forEach(key => {
      if (cleanConfig[key] === 'undefined' || cleanConfig[key] === '') {
        delete cleanConfig[key];
      }
    });

    let newConfigs;
    if (isAddingNew) {
      newConfigs = [...configs, cleanConfig];
    } else {
      newConfigs = configs.map(c => c.host === cleanConfig.host ? cleanConfig : c);
    }
    setConfigs(newConfigs);
    setEditingConfig(null);
    setIsAddingNew(false);
    await saveConfigs(newConfigs);
  };

  const handleAddNew = () => {
    setEditingConfig({
      host: '',
      hostName: '',
      user: '',
      identityFile: '',
      port: '',
      forwardAgent: 'no',
      proxyJump: ''
    });
    setIsAddingNew(true);
  };

  const handleOpenTerminal = async (host) => {
    try {
      await ipcRenderer.invoke('open-terminal', host);
    } catch (error) {
      console.error('Error opening terminal:', error);
    }
  };

  const filteredConfigs = useMemo(() => {
    if (!searchTerm) return configs;
    const searchLower = searchTerm.toLowerCase();
    return configs
      .filter((config, index, self) => 
        index === self.findIndex(c => c.host === config.host) &&
        (config.host?.toLowerCase().includes(searchLower) ||
         config.hostName?.toLowerCase().includes(searchLower) ||
         config.user?.toLowerCase().includes(searchLower))
      );
  }, [configs, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-300">SSH Configuration Manager</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search hosts..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg pl-10 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        
        {configs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No SSH configurations found. Add your first configuration!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConfigs.map(config => (
              <div key={config.host} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-200">{config.host}</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenTerminal(config.host)}
                      className="text-green-400 hover:text-green-300 p-1"
                      title="Open in Terminal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleClone(config)}
                      className="text-purple-400 hover:text-purple-300 p-1"
                      title="Clone"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(config.host)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div><span className="text-gray-500">HostName:</span> {config.hostName}</div>
                  <div><span className="text-gray-500">User:</span> {config.user}</div>
                  {config.identityFile && <div><span className="text-gray-500">IdentityFile:</span> {config.identityFile}</div>}
                  {config.port && <div><span className="text-gray-500">Port:</span> {config.port}</div>}
                  {config.forwardAgent && <div><span className="text-gray-500">ForwardAgent:</span> {config.forwardAgent}</div>}
                  {config.proxyJump && <div><span className="text-gray-500">ProxyJump:</span> {config.proxyJump}</div>}
                </div>
              </div>
            ))}
            {filteredConfigs.length === 0 && searchTerm && (
              <div className="text-center text-gray-400 py-4">
                No configurations found matching "{searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Floating Add Button */}
        <button
          onClick={handleAddNew}
          className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-500 transition-colors"
          title="Add new SSH configuration"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {(editingConfig || isAddingNew) && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg w-1/2 max-w-2xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">
                {isAddingNew ? 'Add New Configuration' : 'Edit Configuration'}
              </h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave(editingConfig);
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-gray-300">Host</label>
                    <input
                      type="text"
                      value={editingConfig.host}
                      onChange={(e) => setEditingConfig({ ...editingConfig, host: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">HostName</label>
                    <input
                      type="text"
                      value={editingConfig.hostName}
                      onChange={(e) => setEditingConfig({ ...editingConfig, hostName: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">User</label>
                    <input
                      type="text"
                      value={editingConfig.user}
                      onChange={(e) => setEditingConfig({ ...editingConfig, user: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">IdentityFile</label>
                    <input
                      type="text"
                      value={editingConfig.identityFile || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, identityFile: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">Port</label>
                    <input
                      type="number"
                      value={editingConfig.port || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, port: parseInt(e.target.value) })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">ForwardAgent</label>
                    <select
                      value={editingConfig.forwardAgent || 'no'}
                      onChange={(e) => setEditingConfig({ ...editingConfig, forwardAgent: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-gray-300">ProxyJump</label>
                    <input
                      type="text"
                      value={editingConfig.proxyJump || ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, proxyJump: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-200"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingConfig(null);
                      setIsAddingNew(false);
                    }}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                  >
                    {isAddingNew ? 'Add' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 