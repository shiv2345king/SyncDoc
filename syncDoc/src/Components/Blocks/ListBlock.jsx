import { CheckSquare, Square } from 'lucide-react';

export function ListBlock({ block, onUpdateBlock, isEditing }) {
  const listType = block.listType || 'bullet'; // 'bullet' | 'number' | 'task'
  const items = block.items || [];
  const checked = block.checked || [];

  const handleToggleTask = (index) => {
    if (!onUpdateBlock) return;
    const newChecked = [...checked];
    newChecked[index] = !newChecked[index];
    onUpdateBlock({
      ...block,
      checked: newChecked
    });
  };

  const handleItemChange = (index, value) => {
    if (!onUpdateBlock) return;
    const newItems = [...items];
    newItems[index] = value;
    onUpdateBlock({
      ...block,
      items: newItems
    });
  };

  const handleAddItem = () => {
    if (!onUpdateBlock) return;
    onUpdateBlock({
      ...block,
      items: [...items, 'New item'],
      checked: listType === 'task' ? [...checked, false] : checked
    });
  };

  const handleRemoveItem = (index) => {
    if (!onUpdateBlock) return;
    const newItems = items.filter((_, i) => i !== index);
    const newChecked = checked.filter((_, i) => i !== index);
    onUpdateBlock({
      ...block,
      items: newItems,
      checked: newChecked
    });
  };

  return (
    <div className={`ast-list-block type-${listType}`}>
      {listType === 'number' ? (
        <ol className="ast-ol">
          {items.map((item, idx) => (
            <li key={idx} className="ast-li">
              {isEditing ? (
                <div className="list-edit-row">
                  <input
                    type="text"
                    className="block-list-input"
                    value={item}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="list-item-delete">×</button>
                </div>
              ) : (
                <span>{item}</span>
              )}
            </li>
          ))}
        </ol>
      ) : listType === 'task' ? (
        <div className="ast-task-list">
          {items.map((item, idx) => (
            <div key={idx} className={`task-item ${checked[idx] ? 'completed' : ''}`}>
              <button
                type="button"
                onClick={() => handleToggleTask(idx)}
                className="task-checkbox-btn"
              >
                {checked[idx] ? (
                  <CheckSquare size={18} className="task-icon checked" />
                ) : (
                  <Square size={18} className="task-icon unchecked" />
                )}
              </button>
              {isEditing ? (
                <div className="list-edit-row">
                  <input
                    type="text"
                    className="block-list-input"
                    value={item}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="list-item-delete">×</button>
                </div>
              ) : (
                <span className="task-text">{item}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="ast-ul">
          {items.map((item, idx) => (
            <li key={idx} className="ast-li">
              {isEditing ? (
                <div className="list-edit-row">
                  <input
                    type="text"
                    className="block-list-input"
                    value={item}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                  />
                  <button type="button" onClick={() => handleRemoveItem(idx)} className="list-item-delete">×</button>
                </div>
              ) : (
                <span>{item}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isEditing && (
        <button type="button" onClick={handleAddItem} className="add-list-item-btn">
          + Add List Item
        </button>
      )}
    </div>
  );
}
