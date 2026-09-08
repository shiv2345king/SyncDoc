import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { INITIAL_DOCUMENTS } from './models/sampleData';
import { yjsService } from './services/yjsService';
import { DocumentSidebar } from './Components/Sidebar/DocumentSidebar';
import { DocumentHeader } from './Components/Header/DocumentHeader';
import { BlockRenderer } from './Components/Blocks/BlockRenderer';
import { ASTTreeVisualizer } from './Components/ASTViewer/ASTTreeVisualizer';
import { ConflictResolverModal } from './Components/ConflictResolver/ConflictResolverModal';
import { ASTInspectorModal } from './Components/ASTViewer/ASTInspectorModal';
import { NewBlockModal } from './Components/NewBlockModal';
import { DocumentGridView } from './Components/DocumentBrowser/DocumentGridView';
import { CollaborativeStatePanel } from './Components/Collaboration/CollaborativeStatePanel';
import { BlockStateProvider, useBlockState } from './context/BlockStateContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './Components/Auth/LandingPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

/** Shows the landing/auth page until the user signs in, then the workspace. */
function AppGate() {
  const { isAuthenticated, user, logout } = useAuth();

  return isAuthenticated ? (
    <BlockStateProvider>
      <AppWorkspace user={user} onLogout={logout} />
    </BlockStateProvider>
  ) : (
    <LandingPage onLogin={useAuth()} />
  );
}

function AppWorkspace({ user, onLogout }) {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [activeDocId, setActiveDocId] = useState('doc-1');

  // Claim the authenticated identity for collaborative presence.
  useEffect(() => {
    if (user) {
      yjsService.updateLocalPresence({
        id: user.id,
        name: `${user.name} (You)`,
        avatar: user.avatar,
        color: user.color,
        cursorBlockId: null,
        cursorOffset: 0,
        selection: null
      });
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atomic block-management state: active cursor + selection bounds
  const {
    cursor,
    selection,
    setActiveCursor,
    startSelection,
    extendSelection,
    clearSelection,
    getSelectionBounds
  } = useBlockState();
  const selectedBlockId = cursor.blockId;
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('split'); // 'editor' | 'split' | 'ast-tree' | 'grid'
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Yjs Collaboration & Presence State
  const [yjsStatus, setYjsStatus] = useState('disconnected');
  const [yjsClientId, setYjsClientId] = useState(0);
  const [presenceUsers, setPresenceUsers] = useState(user ? [{
    id: user.id,
    name: `${user.name} (You)`,
    avatar: user.avatar,
    color: user.color,
    cursorBlockId: null
  }] : []);
  const [showCollabState, setShowCollabState] = useState(false);

  // Modals
  const [activeConflictBlock, setActiveConflictBlock] = useState(null);
  const [inspectedAstBlock, setInspectedAstBlock] = useState(null);
  const [showNewBlockModal, setShowNewBlockModal] = useState(false);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Connect client to Yjs WebSocket on active doc change
  useEffect(() => {
    yjsService.connect(activeDocId);

    const unsubStatus = yjsService.onStatusChange(status => {
      setYjsStatus(status);
      setYjsClientId(yjsService.getClientId());
    });

    const unsubPresence = yjsService.onPresenceChange(states => {
      if (states && states.length > 0) {
        setPresenceUsers(states);
      }
    });

    return () => {
      unsubStatus();
      unsubPresence();
      yjsService.disconnect();
    };
  }, [activeDocId]);

  // Real-time cursor sync across sessions: whenever the socket reconnects,
  // immediately re-advertise the current cursor + selection bounds so peers
  // render our cursor without waiting for the next click.
  useEffect(() => {
    if (yjsStatus === 'connected') {
      const orderedIds = (activeDoc?.ast?.children || []).map(b => b.id);
      const bounds = selection ? getSelectionBounds(orderedIds) : null;
      yjsService.broadcastCursorState({
        cursorBlockId: cursor.blockId,
        cursorOffset: cursor.offset,
        selection: bounds
          ? { startBlockId: bounds.startBlockId, endBlockId: bounds.endBlockId, blockIds: bounds.blockIds }
          : null
      });
    }
  }, [yjsStatus, cursor.blockId, cursor.offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync active document AST blocks to Yjs
  useEffect(() => {
    if (activeDoc?.ast?.children) {
      yjsService.syncBlocksToYjs(activeDoc.ast.children);
    }
  }, [activeDocId, activeDoc?.ast?.children]);

  // Peer Presence Simulation
  const handleSimulatePeer = (blocks) => {
    const peerNames = ['Sarah Jenkins', 'David Kim', 'Amara Okafor', 'Liam Vance'];
    const peerAvatars = [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80'
    ];
    const peerColors = ['#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

    const randomIndex = Math.floor(Math.random() * peerNames.length);
    const targetBlock = blocks && blocks.length > 0 ? blocks[Math.floor(Math.random() * blocks.length)] : null;

    const simulatedPeer = {
      id: `sim-${Date.now()}`,
      name: peerNames[randomIndex],
      avatar: peerAvatars[randomIndex],
      color: peerColors[randomIndex],
      cursorBlockId: targetBlock ? targetBlock.id : null
    };

    setPresenceUsers(prev => [...prev.filter(p => p.id !== simulatedPeer.id), simulatedPeer]);
  };
  const handleSelectDoc = (id) => {
    setActiveDocId(id);
    setActiveCursor(null, 0);
    clearSelection();
  };

  const handleCreateDoc = () => {
    const newDocId = `doc-${Date.now()}`;
    const newDoc = {
      id: newDocId,
      title: "Untitled Collaborative Document",
      category: "General",
      author: "Local User",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      tags: ["Draft", "AST"],
      collaborators: [
        { id: "u1", name: "Local User", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", color: "#6366f1" }
      ],
      ast: {
        type: "doc",
        version: 1,
        children: [
          {
            id: `blk-${Date.now()}-1`,
            type: "heading",
            level: 1,
            content: [{ text: "Untitled Document Title", format: { bold: true } }],
            version: 1,
            metadata: { createdBy: "Local User" }
          },
          {
            id: `blk-${Date.now()}-2`,
            type: "paragraph",
            content: [{ text: "Start editing text blocks using the block-level rendering engine..." }],
            version: 1,
            metadata: { createdBy: "Local User" }
          }
        ]
      }
    };

    setDocuments([newDoc, ...documents]);
    setActiveDocId(newDocId);
    if (viewMode === 'grid') setViewMode('split');
  };

  const handleDeleteDoc = (docId) => {
    const remaining = documents.filter(d => d.id !== docId);
    setDocuments(remaining);
    if (activeDocId === docId && remaining.length > 0) {
      setActiveDocId(remaining[0].id);
    }
  };

  const handleUpdateDocTitle = (newTitle) => {
    setDocuments(documents.map(d => {
      if (d.id !== activeDocId) return d;
      return {
        ...d,
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
    }));
  };

  // Block Level Handlers
  const handleUpdateBlock = (updatedBlock) => {
    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;
      const newChildren = doc.ast.children.map(blk => {
        if (blk.id !== updatedBlock.id) return blk;
        return updatedBlock;
      });
      return {
        ...doc,
        updatedAt: new Date().toISOString(),
        ast: {
          ...doc.ast,
          version: (doc.ast.version || 1) + 1,
          children: newChildren
        }
      };
    }));
  };

  const handleDeleteBlock = (blockId) => {
    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;
      const newChildren = doc.ast.children.filter(b => b.id !== blockId);
      return {
        ...doc,
        updatedAt: new Date().toISOString(),
        ast: {
          ...doc.ast,
          version: (doc.ast.version || 1) + 1,
          children: newChildren
        }
      };
    }));
  };

  const handleMoveBlock = (blockId, direction) => {
    if (!activeDoc) return;
    const blocks = [...activeDoc.ast.children];
    const index = blocks.findIndex(b => b.id === blockId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const temp = blocks[index];
    blocks[index] = blocks[targetIndex];
    blocks[targetIndex] = temp;

    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;
      return {
        ...doc,
        ast: { ...doc.ast, children: blocks }
      };
    }));
  };

  const handleAddBlock = (blockType, insertAfterId = null) => {
    if (!activeDoc) return;

    let newBlock = {
      id: `blk-${Date.now()}`,
      type: blockType,
      version: 1,
      metadata: { createdBy: "Local User" }
    };

    switch (blockType) {
      case 'heading':
        newBlock.level = 2;
        newBlock.content = [{ text: "New Section Heading" }];
        break;
      case 'paragraph':
        newBlock.content = [{ text: "New paragraph block text..." }];
        break;
      case 'code':
        newBlock.language = "typescript";
        newBlock.content = "// Write code here...\nconsole.log('SyncDoc AST');";
        break;
      case 'callout':
        newBlock.variant = "info";
        newBlock.content = [{ text: "Callout note content..." }];
        break;
      case 'quote':
        newBlock.content = [{ text: "Blockquote text..." }];
        break;
      case 'list':
        newBlock.listType = "bullet";
        newBlock.items = ["First item", "Second item"];
        break;
      case 'table':
        newBlock.columns = ["Column A", "Column B"];
        newBlock.rows = [["Data 1", "Data 2"]];
        break;
      case 'divider':
      default:
        break;
    }

    const currentBlocks = [...activeDoc.ast.children];
    let newBlocks = [];

    if (insertAfterId) {
      const idx = currentBlocks.findIndex(b => b.id === insertAfterId);
      if (idx >= 0) {
        currentBlocks.splice(idx + 1, 0, newBlock);
        newBlocks = currentBlocks;
      } else {
        newBlocks = [...currentBlocks, newBlock];
      }
    } else {
      newBlocks = [...currentBlocks, newBlock];
    }

    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;
      return {
        ...doc,
        updatedAt: new Date().toISOString(),
        ast: {
          ...doc.ast,
          version: (doc.ast.version || 1) + 1,
          children: newBlocks
        }
      };
    }));

    setActiveCursor(newBlock.id, 0);
    clearSelection();
  };

  // Conflict Resolution
  const handleResolveConflict = (blockId, resolvedBlockNode) => {
    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;

      const newChildren = doc.ast.children.map(b => {
        if (b.id !== blockId) return b;

        // Strip conflict object and set resolved block
        const cleanNode = { ...resolvedBlockNode };
        delete cleanNode.conflict;
        cleanNode.version = (cleanNode.version || 1) + 1;
        return cleanNode;
      });

      // Check if any other block still has conflicts
      const remainingConflicts = newChildren.some(b => Boolean(b.conflict));

      return {
        ...doc,
        status: remainingConflicts ? 'conflict' : 'synced',
        updatedAt: new Date().toISOString(),
        ast: {
          ...doc.ast,
          version: (doc.ast.version || 1) + 1,
          children: newChildren
        }
      };
    }));

    setActiveConflictBlock(null);
  };

  /**
   * Block selection / cursor handling with atomic state updates.
   * Plain click  → move active cursor to the block (offset 0)
   * Shift+click  → extend the selection bounds from the anchor to this block
   * Either way the cursor + selection are broadcast through Yjs awareness.
   */
  const handleBlockSelect = (blockId, opts = {}) => {
    const { shiftKey = false, offset = 0 } = opts;

    if (shiftKey) {
      if (!selection) {
        // No anchor yet — start a new selection at this block
        startSelection(blockId, offset);
      } else {
        extendSelection(blockId, offset);
      }
    } else {
      clearSelection();
      setActiveCursor(blockId, offset);
    }

    // Reflect the atomic state in collaborative presence
    const orderedIds = (activeDoc?.ast?.children || []).map(b => b.id);
    const bounds = shiftKey
      ? getSelectionBounds(orderedIds)
      : null;

    yjsService.broadcastCursorState({
      cursorBlockId: blockId,
      cursorOffset: offset,
      selection: bounds
        ? { startBlockId: bounds.startBlockId, endBlockId: bounds.endBlockId, blockIds: bounds.blockIds }
        : null
    });
  };

  const handleExportAstJson = () => {
    if (!activeDoc) return;
    const jsonStr = JSON.stringify(activeDoc.ast, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.title.replace(/\s+/g, '_')}-AST.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`sync-app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Sidebar Component */}
      <DocumentSidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={handleSelectDoc}
        onCreateDoc={handleCreateDoc}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Workspace */}
      <main className="sync-workspace">
        {/* Authenticated user chip + logout */}
        <div className="session-user-chip" title={user?.email}>
          <img src={user?.avatar} alt={user?.name} className="session-avatar" />
          <span className="session-name">{user?.name}</span>
          <button
            type="button"
            className="session-logout-btn"
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>

        {viewMode === 'grid' ? (
          <DocumentGridView
            documents={documents}
            onSelectDoc={(id) => {
              handleSelectDoc(id);
              setViewMode('split');
            }}
            onCreateDoc={handleCreateDoc}
            onDeleteDoc={handleDeleteDoc}
            onOpenConflictModal={(b) => setActiveConflictBlock(b)}
          />
        ) : (
          <>
            <DocumentHeader
              document={activeDoc}
              onUpdateTitle={handleUpdateDocTitle}
              onOpenConflictModal={() => {
                const cBlock = activeDoc?.ast?.children?.find(b => b.conflict);
                if (cBlock) setActiveConflictBlock(cBlock);
              }}
              onOpenNewBlockModal={() => setShowNewBlockModal(true)}
              onExportAstJson={handleExportAstJson}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isDarkMode={isDarkMode}
              onToggleTheme={() => setIsDarkMode(!isDarkMode)}
              yjsStatus={yjsStatus}
              yjsClientId={yjsClientId}
              presenceUsers={presenceUsers}
              onSimulatePeer={handleSimulatePeer}
              onReconnectYjs={() => yjsService.connect(activeDocId)}
              onDisconnectYjs={() => yjsService.disconnect()}
              showCollabState={showCollabState}
              onToggleCollabState={() => setShowCollabState(!showCollabState)}
            />

            {showCollabState && (
              <CollaborativeStatePanel
                status={yjsStatus}
                roomName={activeDocId}
                clientId={yjsClientId}
                presenceUsers={presenceUsers}
                activeDoc={activeDoc}
                cursorState={cursor}
                selectionState={selection ? getSelectionBounds((activeDoc?.ast?.children || []).map(b => b.id)) : null}
                onSimulatePeer={handleSimulatePeer}
                onReconnect={() => yjsService.connect(activeDocId)}
              />
            )}

            <div className="sync-canvas-container">
              {/* Document Editor Canvas */}
              {(viewMode === 'editor' || viewMode === 'split') && (
                <div className="document-scroll-canvas">
                  <div className="document-paper-sheet">
                    {(() => {
                      const orderedIds = (activeDoc?.ast?.children || []).map(b => b.id);
                      const selBounds = getSelectionBounds(orderedIds);
                      return activeDoc?.ast?.children?.map(block => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        selectedBlockId={selectedBlockId}
                        selectionBlockIds={selBounds?.blockIds || null}
                        onSelectBlock={handleBlockSelect}
                        onUpdateBlock={handleUpdateBlock}
                        onDeleteBlock={handleDeleteBlock}
                        onMoveUp={(id) => handleMoveBlock(id, 'up')}
                        onMoveDown={(id) => handleMoveBlock(id, 'down')}
                        onInsertAfter={(id) => handleAddBlock('paragraph', id)}
                        onOpenConflict={(b) => setActiveConflictBlock(b)}
                        onOpenAstInspector={(b) => setInspectedAstBlock(b)}
                                  presencePeers={presenceUsers}
                                />
                                ));
                              })()}
                            </div>
                          </div>
                        )}

              {/* AST Tree Visualizer Side Panel or Full Panel */}
              {(viewMode === 'split' || viewMode === 'ast-tree') && (
                <ASTTreeVisualizer
                  document={activeDoc}
                  selectedBlockId={selectedBlockId}
                  selectionBlockIds={getSelectionBounds((activeDoc?.ast?.children || []).map(b => b.id))?.blockIds || null}
                  onSelectBlock={handleBlockSelect}
                  onOpenConflictModal={(b) => setActiveConflictBlock(b)}
                  onOpenAstInspector={(b) => setInspectedAstBlock(b)}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Conflict Resolver Modal */}
      {activeConflictBlock && (
        <ConflictResolverModal
          block={activeConflictBlock}
          onClose={() => setActiveConflictBlock(null)}
          onResolveConflict={handleResolveConflict}
        />
      )}

      {/* AST Node JSON Inspector Modal */}
      {inspectedAstBlock && (
        <ASTInspectorModal
          block={inspectedAstBlock}
          onClose={() => setInspectedAstBlock(null)}
        />
      )}

      {/* Add New Block Selector Modal */}
      {showNewBlockModal && (
        <NewBlockModal
          onClose={() => setShowNewBlockModal(false)}
          onAddBlock={(type) => handleAddBlock(type)}
        />
      )}
    </div>
  );
}

export default App;
