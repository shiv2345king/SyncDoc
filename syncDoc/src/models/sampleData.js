// AST Node Types and Initial Sample Documents for SyncDoc

export const INITIAL_DOCUMENTS = [
  {
    id: "doc-1",
    title: "SyncDoc Architecture & AST Conflict Resolution Spec",
    category: "Engineering Specs",
    author: "Alex Rivers",
    createdAt: "2026-08-15T09:30:00Z",
    updatedAt: "2026-08-20T14:15:00Z",
    status: "conflict", // 'synced' | 'syncing' | 'conflict' | 'draft'
    tags: ["AST", "CRDT", "Architecture", "v2.0"],
    collaborators: [
      { id: "u1", name: "Alex Rivers", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", color: "#6366f1" },
      { id: "u2", name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80", color: "#ec4899" },
      { id: "u3", name: "Marcus Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80", color: "#10b981" }
    ],
    ast: {
      type: "doc",
      version: 14,
      children: [
        {
          id: "blk-101",
          type: "heading",
          level: 1,
          content: [
            { text: "SyncDoc: AST-Based Collaborative Document Engine", format: { bold: true } }
          ],
          version: 3,
          metadata: { createdBy: "Alex Rivers", lastModifiedBy: "Alex Rivers" }
        },
        {
          id: "blk-102",
          type: "callout",
          variant: "info",
          content: [
            { text: "Notice: ", format: { bold: true } },
            { text: "This document contains an active ", format: {} },
            { text: "AST Structural Conflict", format: { bold: true, underline: true } },
            { text: " in block #blk-105 due to concurrent edits between Alex and Elena." }
          ],
          version: 2,
          metadata: { createdBy: "Alex Rivers" }
        },
        {
          id: "blk-103",
          type: "paragraph",
          content: [
            { text: "SyncDoc represents documents as a hierarchical ", format: {} },
            { text: "Abstract Syntax Tree (AST)", format: { bold: true, code: true } },
            { text: " rather than plain flat strings. Each block in the document is an AST node containing version vectors, formatting spans, and structural metadata." }
          ],
          version: 5,
          metadata: { createdBy: "Marcus Chen" }
        },
        {
          id: "blk-104",
          type: "heading",
          level: 2,
          content: [
            { text: "1. Key Architecture Principles" }
          ],
          version: 1,
          metadata: { createdBy: "Alex Rivers" }
        },
        {
          id: "blk-105",
          type: "code",
          language: "typescript",
          content: `// Local AST Node Definition (Alex)
interface ASTBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'code' | 'callout' | 'list' | 'table';
  versionVector: Record<string, number>;
  children?: ASTBlock[];
  content: TextSegment[];
  hash: string;
}`,
          version: 8,
          conflict: {
            id: "cnf-901",
            authorLocal: "Alex Rivers (Local)",
            authorRemote: "Elena Rostova (Remote)",
            timestamp: "2026-08-20T14:14:22Z",
            type: "content_mismatch",
            localNode: {
              id: "blk-105",
              type: "code",
              language: "typescript",
              content: `// Local AST Node Definition (Alex)
interface ASTBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'code' | 'callout' | 'list' | 'table';
  versionVector: Record<string, number>;
  children?: ASTBlock[];
  content: TextSegment[];
  hash: string;
}`,
              version: 8
            },
            remoteNode: {
              id: "blk-105",
              type: "code",
              language: "typescript",
              content: `// Remote AST Node Definition (Elena)
interface ASTBlockNode {
  nodeId: string;
  kind: 'heading' | 'paragraph' | 'code' | 'callout' | 'list' | 'table';
  lwwTimestamp: number;
  astChildren?: ASTBlockNode[];
  inlineSegments: Array<{ text: string; marks: string[] }>;
  checksum: string;
}`,
              version: 9
            }
          },
          metadata: { createdBy: "Alex Rivers" }
        },
        {
          id: "blk-106",
          type: "quote",
          content: [
            { text: "By operating directly on block AST nodes, conflict resolution preserves semantic document structure even during complex multi-user concurrent offline edits.", format: { italic: true } }
          ],
          version: 2,
          metadata: { createdBy: "Elena Rostova" }
        },
        {
          id: "blk-107",
          type: "heading",
          level: 2,
          content: [
            { text: "2. Block Feature Matrix" }
          ],
          version: 1,
          metadata: { createdBy: "Alex Rivers" }
        },
        {
          id: "blk-108",
          type: "list",
          listType: "task",
          items: [
            "Block-level text rendering engine",
            "AST visualizer and tree inspector",
            "Interactive AST conflict resolution modal",
            "Real-time collaborator cursor badges",
            "Rich inline text formatting (bold, italic, inline code, link)"
          ],
          checked: [true, true, true, true, true],
          version: 4,
          metadata: { createdBy: "Marcus Chen" }
        },
        {
          id: "blk-109",
          type: "table",
          columns: ["AST Node", "CRDT Algorithm", "Resolution Strategy", "Status"],
          rows: [
            ["HeadingNode", "LWW-Register", "Last-Write-Wins Title", "Optimal"],
            ["TextParagraph", "Rope / Per-Block Yjs", "Character-level Merging", "Stable"],
            ["CodeBlockNode", "AST Structural Diff", "3-Way Tree Merge / Visual Diff", "Testing"],
            ["CalloutNode", "State-based CRDT", "Semantic Container Merge", "Optimal"]
          ],
          version: 3,
          metadata: { createdBy: "Elena Rostova" }
        }
      ]
    }
  },
  {
    id: "doc-2",
    title: "Real-Time CRDT Engine & Vector Clocks",
    category: "Algorithm Design",
    author: "Elena Rostova",
    createdAt: "2026-08-18T11:00:00Z",
    updatedAt: "2026-08-20T12:00:00Z",
    status: "synced",
    tags: ["CRDT", "Distributed Systems", "Sync"],
    collaborators: [
      { id: "u2", name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80", color: "#ec4899" },
      { id: "u1", name: "Alex Rivers", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", color: "#6366f1" }
    ],
    ast: {
      type: "doc",
      version: 22,
      children: [
        {
          id: "blk-201",
          type: "heading",
          level: 1,
          content: [{ text: "CRDT State Sync & Vector Clock Protocol", format: { bold: true } }],
          version: 1,
          metadata: { createdBy: "Elena Rostova" }
        },
        {
          id: "blk-202",
          type: "paragraph",
          content: [
            { text: "Conflict-free Replicated Data Types (CRDTs) guarantee convergence across distributed peers without requiring a central consensus authority." }
          ],
          version: 2,
          metadata: { createdBy: "Elena Rostova" }
        },
        {
          id: "blk-203",
          type: "callout",
          variant: "success",
          content: [
            { text: "Performance Target: ", format: { bold: true } },
            { text: "Sub-10ms local AST update rendering with background peer gossip synchronization." }
          ],
          version: 1,
          metadata: { createdBy: "Elena Rostova" }
        },
        {
          id: "blk-204",
          type: "code",
          language: "javascript",
          content: `function mergeVectorClocks(clockA, clockB) {
  const merged = { ...clockA };
  for (const [peer, seq] of Object.entries(clockB)) {
    merged[peer] = Math.max(merged[peer] || 0, seq);
  }
  return merged;
}`,
          version: 3,
          metadata: { createdBy: "Elena Rostova" }
        }
      ]
    }
  },
  {
    id: "doc-3",
    title: "Block Rendering Pipeline & Virtualization Benchmarks",
    category: "Frontend Performance",
    author: "Marcus Chen",
    createdAt: "2026-08-10T15:20:00Z",
    updatedAt: "2026-08-19T18:40:00Z",
    status: "synced",
    tags: ["React", "Performance", "Virtualization"],
    collaborators: [
      { id: "u3", name: "Marcus Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80", color: "#10b981" }
    ],
    ast: {
      type: "doc",
      version: 9,
      children: [
        {
          id: "blk-301",
          type: "heading",
          level: 1,
          content: [{ text: "Virtualizing 10,000+ AST Block Nodes in React 19" }],
          version: 1,
          metadata: { createdBy: "Marcus Chen" }
        },
        {
          id: "blk-302",
          type: "paragraph",
          content: [
            { text: "Rendering large documents requires memoizing block components based on AST node immutability keys and version hashes." }
          ],
          version: 2,
          metadata: { createdBy: "Marcus Chen" }
        },
        {
          id: "blk-303",
          type: "list",
          listType: "bullet",
          items: [
            "Use IntersectionObserver for off-screen AST block unmounting",
            "Maintain fast mapping from blockId -> AST Node object",
            "Batch atomic text edits using React transitions"
          ],
          version: 3,
          metadata: { createdBy: "Marcus Chen" }
        }
      ]
    }
  },
  {
    id: "doc-4",
    title: "Drafting AST Conflict Strategy v3",
    category: "Proposals",
    author: "Alex Rivers",
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-08-20T10:05:00Z",
    status: "draft",
    tags: ["Draft", "AST"],
    collaborators: [
      { id: "u1", name: "Alex Rivers", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80", color: "#6366f1" }
    ],
    ast: {
      type: "doc",
      version: 1,
      children: [
        {
          id: "blk-401",
          type: "heading",
          level: 1,
          content: [{ text: "Three-Way AST Node Graph Merging" }],
          version: 1,
          metadata: { createdBy: "Alex Rivers" }
        },
        {
          id: "blk-402",
          type: "paragraph",
          content: [{ text: "Initial draft proposing a visual diff tree view for nested block structures..." }],
          version: 1,
          metadata: { createdBy: "Alex Rivers" }
        }
      ]
    }
  }
];
