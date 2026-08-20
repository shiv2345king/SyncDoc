export function TableBlock({ block, onUpdateBlock, isEditing }) {
  const columns = block.columns || ['Header 1', 'Header 2'];
  const rows = block.rows || [['Cell 1', 'Cell 2']];

  const handleCellChange = (rowIndex, colIndex, value) => {
    if (!onUpdateBlock) return;
    const newRows = rows.map((r, rIdx) => {
      if (rIdx !== rowIndex) return r;
      const newR = [...r];
      newR[colIndex] = value;
      return newR;
    });
    onUpdateBlock({
      ...block,
      rows: newRows
    });
  };

  const handleHeaderChange = (colIndex, value) => {
    if (!onUpdateBlock) return;
    const newCols = [...columns];
    newCols[colIndex] = value;
    onUpdateBlock({
      ...block,
      columns: newCols
    });
  };

  return (
    <div className="ast-table-container">
      <table className="ast-table">
        <thead>
          <tr>
            {columns.map((col, cIdx) => (
              <th key={cIdx}>
                {isEditing ? (
                  <input
                    type="text"
                    className="table-input header"
                    value={col}
                    onChange={(e) => handleHeaderChange(cIdx, e.target.value)}
                  />
                ) : (
                  <span>{col}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>
                  {isEditing ? (
                    <input
                      type="text"
                      className="table-input"
                      value={cell}
                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                    />
                  ) : (
                    <span>{cell}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
