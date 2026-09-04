/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';

/**
 * BlockStateContext — atomic block-management state for the editor canvas.
 *
 * Tracks:
 *  - cursor:        the active caret position  { blockId, offset, updatedAt }
 *  - selection:     anchor → focus bounds across blocks
 *                   { anchor: {blockId, offset}, focus: {blockId, offset} }
 *  - node registry: per-blockId listener sets so a *specific* AST node can be
 *                   notified/re-rendered on screen without re-rendering the
 *                   whole document tree.
 */

const BlockStateContext = createContext(null);

export function BlockStateProvider({ children }) {
  const [cursor, setCursorState] = useState({ blockId: null, offset: 0, updatedAt: null });
  const [selection, setSelection] = useState(null);

  // ---- Per-block surgical update registry -------------------------------
  // Maps blockId -> Set<callback>. Components subscribe to the individual
  // AST node they render; producers notify only the affected node.
  const nodeListeners = useRef(new Map());

  const subscribeBlock = useCallback((blockId, listener) => {
    if (!blockId) return () => { };
    if (!nodeListeners.current.has(blockId)) {
      nodeListeners.current.set(blockId, new Set());
    }
    nodeListeners.current.get(blockId).add(listener);
    return () => {
      const set = nodeListeners.current.get(blockId);
      if (!set) return;
      set.delete(listener);
      if (set.size === 0) nodeListeners.current.delete(blockId);
    };
  }, []);

  const notifyBlockUpdated = useCallback((blockId) => {
    const set = nodeListeners.current.get(blockId);
    if (set) set.forEach(fn => fn(blockId));
  }, []);

  // ---- Cursor ------------------------------------------------------------
  const setActiveCursor = useCallback((blockId, offset = 0) => {
    setCursorState({
      blockId,
      offset,
      updatedAt: new Date().toISOString()
    });
  }, []);

  // ---- Selection bounds ----------------------------------------------------
  const startSelection = useCallback((blockId, offset = 0) => {
    const point = { blockId, offset };
    setSelection({ anchor: point, focus: point });
  }, []);

  const extendSelection = useCallback((blockId, offset = 0) => {
    setSelection(prev => {
      const anchor = prev ? prev.anchor : { blockId, offset };
      return { anchor, focus: { blockId, offset } };
    });
  }, []);

  const clearSelection = useCallback(() => setSelection(null), []);

  /**
   * Normalized selection bounds over the ordered block list.
   * Returns null when there is no multi/point selection.
   *   { startBlockId, endBlockId, startOffset, endOffset, isBackward, blockIds }
   */
  const getSelectionBounds = useCallback((orderedBlockIds) => {
    if (!selection) return null;
    const { anchor, focus } = selection;
    const anchorIdx = orderedBlockIds.indexOf(anchor.blockId);
    const focusIdx = orderedBlockIds.indexOf(focus.blockId);
    const isBackward =
      anchorIdx >= 0 && focusIdx >= 0
        ? focusIdx < anchorIdx || (focusIdx === anchorIdx && focus.offset < anchor.offset)
        : false;

    const start = isBackward ? focus : anchor;
    const end = isBackward ? anchor : focus;

    let blockIds = [];
    if (anchorIdx >= 0 && focusIdx >= 0) {
      const [lo, hi] = anchorIdx <= focusIdx ? [anchorIdx, focusIdx] : [focusIdx, anchorIdx];
      blockIds = orderedBlockIds.slice(lo, hi + 1);
    }

    return {
      startBlockId: start.blockId,
      endBlockId: end.blockId,
      startOffset: start.offset,
      endOffset: end.offset,
      isBackward,
      blockIds,
      anchor,
      focus
    };
  }, [selection]);

  const value = useMemo(() => ({
    cursor,
    selection,
    hasSelection: Boolean(selection),
    setActiveCursor,
    startSelection,
    extendSelection,
    clearSelection,
    getSelectionBounds,
    subscribeBlock,
    notifyBlockUpdated
  }), [cursor, selection, setActiveCursor, startSelection, extendSelection, clearSelection, getSelectionBounds, subscribeBlock, notifyBlockUpdated]);

  return (
    <BlockStateContext.Provider value={value}>
      {children}
    </BlockStateContext.Provider>
  );
}

export function useBlockState() {
  const ctx = useContext(BlockStateContext);
  if (!ctx) {
    throw new Error('useBlockState must be used within a BlockStateProvider');
  }
  return ctx;
}
