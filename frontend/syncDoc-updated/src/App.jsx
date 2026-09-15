import { useState, useEffect, useCallback } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { yjsService } from './services/yjsService';
import { documentService, normalizeDocument } from './services/documentService';
import { blockService } from './services/blockService';
import { toFrontendBlock } from './models/blockTransform';
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

/** Shows a boot screen while an OAuth redirect is verified, then the landing/auth page, then the workspace. */
function AppGate() {
  const auth = useAuth();
  const { isAuthenticated, user, logout, checkingOAuth } = auth;

  if (checkingOAuth) {
    return (
      <div className="oauth-loading">
        <Loader2 size={22} className="spin" />
        <span>Signing you in…</span>
      </div>
    );
  }

  return isAuthenticated ? (
    <BlockStateProvider>
      <AppWorkspace user={user} onLogout={logout} />
    </BlockStateProvider>
  ) : (
    <LandingPage onLogin={auth} />
  );
}

function AppWorkspace({ user, onLogout }) {
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docDetailLoading, setDocDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

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

  const activeDoc = documents.find(d => d.id === activeDocId) || null;

  // Load the signed-in user's documents from the backend once on mount.
  useEffect(() => {
    let cancelled = false;
    setDocsLoading(true);
    setLoadError(null);

    documentService
      .list(user?.name)
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
        if (docs.length > 0) setActiveDocId(docs[0].id);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Failed to load documents');
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever the active document changes, fetch its blocks and merge them in
  // (the list endpoint intentionally doesn't return blocks, to keep it light).
  useEffect(() => {
    if (!activeDocId) return;
    const alreadyLoaded = documents.find(d => d.id === activeDocId)?.ast?.children?.length > 0;
    if (alreadyLoaded) return;

    let cancelled = false;
    setDocDetailLoading(true);

    documentService
      .getWithBlocks(activeDocId)
      .then(({ blocks }) => {
        if (cancelled) return;
        const frontendBlocks = blocks
          .map(toFrontendBlock)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        setDocuments((prev) => prev.map((d) =>
          d.id === activeDocId
            ? { ...d, ast: { ...d.ast, children: frontendBlocks } }
            : d
        ));
      })
      .catch((err) => setLoadError(err.message || 'Failed to load document'))
      .finally(() => { if (!cancelled) setDocDetailLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Connect client to Yjs WebSocket on active doc change
  useEffect(() => {
    if (!activeDocId) return;
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

  // Peer Presence Simulation — a manual demo trigger (button in the header),
  // not persisted anywhere; useful for demoing presence UI without a second browser.
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

  const handleCreateDoc = async () => {
    try {
      const newDoc = await documentService.create('Untitled Collaborative Document', user?.name);

      // Seed it with a starter heading + paragraph, same as before — just
      // persisted for real this time.
      const headingBlock = await blockService.create(
        { type: 'heading', level: 1, content: [{ text: 'Untitled Document Title', format: { bold: true } }], version: 1, metadata: { createdBy: user?.name } },
        newDoc.id,
        0
      );
      const paragraphBlock = await blockService.create(
        { type: 'paragraph', content: [{ text: 'Start editing text blocks using the block-level rendering engine...' }], version: 1, metadata: { createdBy: user?.name } },
        newDoc.id,
        1
      );

      const hydratedDoc = { ...newDoc, ast: { ...newDoc.ast, children: [headingBlock, paragraphBlock] } };

      setDocuments(prev => [hydratedDoc, ...prev]);
      setActiveDocId(newDoc.id);
      if (viewMode === 'grid') setViewMode('split');
    } catch (err) {
      setLoadError(err.message || 'Failed to create document');
    }
  };

  // NOTE: the backend doesn't expose DELETE /api/documents/:id or
  // PATCH /api/documents/:id yet — these two stay local-only until that
  // route exists, so a page refresh will bring a deleted/renamed doc back.
  const handleDeleteDoc = (docId) => {
    const remaining = documents.filter(d => d.id !== docId);
    setDocuments(remaining);
    if (activeDocId === docId) {
      setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleUpdateDocTitle = (newTitle) => {
    setDocuments(documents.map(d => {
      if (d.id !== activeDocId) return d;
      return { ...d, title: newTitle, updatedAt: new Date().toISOString() };
    }));
  };

  // Block Level Handlers — optimistic local update, backed by a real PATCH.
  const handleUpdateBlock = useCallback((updatedBlock) => {
    setDocuments(prevDocs => prevDocs.map(doc => {
      if (doc.id !== activeDocId) return doc;
      const newChildren = doc.ast.children.map(blk => (blk.id === updatedBlock.id ? updatedBlock : blk));
      return {
        ...doc,
        updatedAt: new Date().toISOString(),
        ast: { ...doc.ast, version: (doc.ast.version || 1) + 1, children: newChildren }
      };
    }));

    blockService.update(updatedBlock).catch((err) => {
      console.error('Failed to save block:', err.message);
    });
  }, [activeDocId]);

  const handleDeleteBlock = (blockId) => {
    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;
      const newChildren = doc.ast.children.filter(b => b.id !== blockId);
      return {
        ...doc,
        updatedAt: new Date().toISOString(),
        ast: { ...doc.ast, version: (doc.ast.version || 1) + 1, children: newChildren }
      };
    }));

    blockService.remove(blockId).catch((err) => {
      console.error('Failed to delete block:', err.message);
    });
  };

  // NOTE: reordering is local-only for now — the backend has no batch
  // reorder endpoint, so a refresh will restore the last persisted order.
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
      return { ...doc, ast: { ...doc.ast, children: blocks } };
    }));
  };

  const handleAddBlock = async (blockType, insertAfterId = null) => {
    if (!activeDoc) return;

    let draft = { type: blockType, version: 1, metadata: { createdBy: user?.name } };

    switch (blockType) {
      case 'heading':
        draft.level = 2;
        draft.content = [{ text: 'New Section Heading' }];
        break;
      case 'paragraph':
        draft.content = [{ text: 'New paragraph block text...' }];
        break;
      case 'code':
        draft.language = 'typescript';
        draft.content = "// Write code here...\nconsole.log('SyncDoc AST');";
        break;
      case 'callout':
        draft.variant = 'info';
        draft.content = [{ text: 'Callout note content...' }];
        break;
      case 'quote':
        draft.content = [{ text: 'Blockquote text...' }];
        break;
      case 'list':
        draft.listType = 'bullet';
        draft.items = ['First item', 'Second item'];
        break;
      case 'table':
        draft.columns = ['Column A', 'Column B'];
        draft.rows = [['Data 1', 'Data 2']];
        break;
      case 'divider':
      default:
        break;
    }

    try {
      const order = activeDoc.ast.children.length;
      const savedBlock = await blockService.create(draft, activeDoc.id, order);

      const currentBlocks = [...activeDoc.ast.children];
      let newBlocks;

      if (insertAfterId) {
        const idx = currentBlocks.findIndex(b => b.id === insertAfterId);
        if (idx >= 0) {
          currentBlocks.splice(idx + 1, 0, savedBlock);
          newBlocks = currentBlocks;
        } else {
          newBlocks = [...currentBlocks, savedBlock];
        }
      } else {
        newBlocks = [...currentBlocks, savedBlock];
      }

      setDocuments(documents.map(doc => {
        if (doc.id !== activeDocId) return doc;
        return {
          ...doc,
          updatedAt: new Date().toISOString(),
          ast: { ...doc.ast, version: (doc.ast.version || 1) + 1, children: newBlocks }
        };
      }));

      setActiveCursor(savedBlock.id, 0);
      clearSelection();
    } catch (err) {
      setLoadError(err.message || 'Failed to create block');
    }
  };

  // Conflict Resolution (client-side AST merge demo — the backend doesn't
  // generate conflict objects; this operates on whatever `.conflict` shape
  // a block already carries, e.g. from the AST inspector / manual testing).
  const handleResolveConflict = (blockId, resolvedBlockNode) => {
    const cleanNode = { ...resolvedBlockNode };
    delete cleanNode.conflict;
    cleanNode.version = (cleanNode.version || 1) + 1;

    setDocuments(documents.map(doc => {
      if (doc.id !== activeDocId) return doc;

      const newChildren = doc.ast.children.map(b => (b.id === blockId ? cleanNode : b));
      const remainingConflicts = newChildren.some(b => Boolean(b.conflict));

      return {
        ...doc,
        status: remainingConflicts ? 'conflict' : 'synced',
        updatedAt: new Date().toISOString(),
        ast: { ...doc.ast, version: (doc.ast.version || 1) + 1, children: newChildren }
      };
    }));

    // Persist the resolved content the same way any other block edit is saved.
    blockService.update(cleanNode).catch((err) => {
      console.error('Failed to save resolved block:', err.message);
    });

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
        startSelection(blockId, offset);
      } else {
        extendSelection(blockId, offset);
      }
    } else {
      clearSelection();
      setActiveCursor(blockId, offset);
    }

    const orderedIds = (activeDoc?.ast?.children || []).map(b => b.id);
    const bounds = shiftKey ? getSelectionBounds(orderedIds) : null;

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

  if (docsLoading) {
    return (
      <div className="oauth-loading">
        <Loader2 size={22} className="spin" />
        <span>Loading your documents…</span>
      </div>
    );
  }

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

        {loadError && (
          <div className="auth-error" role="alert" style={{ margin: '12px 24px' }}>
            {loadError}
          </div>
        )}

        {!activeDoc ? (
          <div className="oauth-loading">
            <span>No documents yet — create one to get started.</span>
          </div>
        ) : viewMode === 'grid' ? (
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
                    {docDetailLoading && (
                      <div className="oauth-loading" style={{ padding: '40px 0' }}>
                        <Loader2 size={18} className="spin" />
                        <span>Loading blocks…</span>
                      </div>
                    )}
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
