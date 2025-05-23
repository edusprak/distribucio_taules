// frontend/src/components/tables/TableList.js
import React from 'react';
import TableListItem from './TableListItem';

function TableList({ tables, onEditTable, onDeleteTable }) {
  if (!tables || tables.length === 0) {
    return <p style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No hi ha taules per mostrar.</p>;
  }

  return (
    <div>
      {tables.map(table => (
        <TableListItem 
          key={table.id} 
          table={table} 
          onEdit={onEditTable}
          onDelete={onDeleteTable}
        />
      ))}
    </div>
  );
}

export default TableList;