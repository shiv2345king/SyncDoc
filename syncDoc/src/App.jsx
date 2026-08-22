import { useState, useEffect } from 'react';
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
import './App.css';

function App() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [activeDocId, setActiveDocId] = useState('doc-1');
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('split'); // 'editor' | 'split' | 'ast-tree' | 'grid'
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Yjs Collaboration & Presence State
  const [yjsStatus, setYjsStatus] = useState('disconnected');
  const [yjsClientId, setYjsClientId] = useState(0);
  const [presenceUsers, setPresenceUsers] = useState([
    {
      id: 'local-1',
      name: 'Alex Rivers (You)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      color: '#6366f1',
      cursorBlockId: null
    },
    {
      id: 'peer-2',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      color: '#ec4899',
      cursorBlockId: 'blk-105'
    },
    {
      id: 'peer-3',
      name: 'Marcus Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      color: '#10b981',
      cursorBlockId: 'blk-108'
    }
  ]);
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
    setSelectedBlockId(null);
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

    setSelectedBlockId(newBlock.id);
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
                onSimulatePeer={handleSimulatePeer}
                onReconnect={() => yjsService.connect(activeDocId)}
              />
            )}

            <div className="sync-canvas-container">
              {/* Document Editor Canvas */}
              {(viewMode === 'editor' || viewMode === 'split') && (
                <div className="document-scroll-canvas">
                  <div className="document-paper-sheet">
                    {activeDoc?.ast?.children?.map(block => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={(id) => {
                          setSelectedBlockId(id);
                          yjsService.updateLocalPresence({ cursorBlockId: id });
                        }}
                        onUpdateBlock={handleUpdateBlock}
                        onDeleteBlock={handleDeleteBlock}
                        onMoveUp={(id) => handleMoveBlock(id, 'up')}
                        onMoveDown={(id) => handleMoveBlock(id, 'down')}
                        onInsertAfter={(id) => handleAddBlock('paragraph', id)}
                        onOpenConflict={(b) => setActiveConflictBlock(b)}
                        onOpenAstInspector={(b) => setInspectedAstBlock(b)}
                        presencePeers={presenceUsers}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AST Tree Visualizer Side Panel or Full Panel */}
              {(viewMode === 'split' || viewMode === 'ast-tree') && (
                <ASTTreeVisualizer
                  document={activeDoc}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
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
