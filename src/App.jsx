import { useRef, useState } from 'react';
import AgentChat from './components/AgentChat.jsx';
import NewFileModal from './components/NewFileModal.jsx';
import Sidebar from './components/Sidebar.jsx';
import SuggestedFiles from './components/SuggestedFiles.jsx';
import WritelyEditor from './components/WritelyEditor.jsx';
import { useWritely } from './hooks/useWritely.js';
import { IMPORT_ACCEPT } from './utils/importWritely.js';

export default function App() {
  const {
    writelys,
    activeId,
    activeWritely,
    ready,
    status,
    openWritely,
    createWritely,
    importWritely,
    updateWritely,
    deleteWritely,
  } = useWritely();
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);
  const importRef = useRef(null);

  const handleImportPick = () => importRef.current?.click();

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) importWritely(file);
  };

  const handleDelete = () => {
    if (!activeId) return;
    if (window.confirm('Delete this Writely?')) {
      deleteWritely(activeId);
    }
  };

  const handleConfirmSize = (size) => {
    setModalOpen(false);
    createWritely(size);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <Sidebar
        writelys={writelys}
        activeId={activeId}
        onSelect={openWritely}
        onCreate={() => setModalOpen(true)}
        onHome={() => openWritely(null)}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
      />
      <main
        className={`flex min-h-0 flex-1 flex-col px-10 py-6 ${
          activeWritely ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {!ready ? (
          <div className="m-auto text-sm text-muted">Loading Writely...</div>
        ) : activeWritely ? (
          <WritelyEditor
            key={activeWritely.id}
            writely={activeWritely}
            onChangeTitle={(title) => updateWritely(activeWritely.id, { title })}
            onChangeMargin={(margin) => updateWritely(activeWritely.id, { margin })}
            onChangeDoc={(doc) => updateWritely(activeWritely.id, { doc })}
            onDelete={handleDelete}
            onNew={() => setModalOpen(true)}
            onImport={handleImportPick}
            onHome={() => openWritely(null)}
            onSave={() => updateWritely(activeWritely.id, {})}
          />
        ) : (
          <SuggestedFiles
            writelys={writelys}
            onSelect={openWritely}
            onCreate={() => setModalOpen(true)}
            onImport={handleImportPick}
          />
        )}
      </main>
      <AgentChat open={agentOpen} onToggle={() => setAgentOpen((open) => !open)} />
      <input
        ref={importRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="sr-only"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <NewFileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmSize}
      />
      <div
        className={`fixed bottom-3.5 left-1/2 -translate-x-1/2 text-xs transition-opacity duration-300 ${
          status.visible ? 'opacity-100' : 'opacity-0'
        } ${status.error ? 'text-danger' : 'text-muted'}`}
      >
        {status.message}
      </div>
    </div>
  );
}
