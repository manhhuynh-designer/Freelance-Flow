import React, { useState } from 'react';

const TableHandler = () => {
    const [tableData, setTableData] = useState<any[]>([]);

    function handlePasteReplace(pastedData: any[]) {
        const targetTable = [...tableData];
        pastedData.forEach((row, rowIndex) => {
            Object.keys(row).forEach((col) => {
                // Thay thế luôn giá trị ở cột description và price
                if (col === 'description' || col === 'price') {
                    targetTable[rowIndex][col] = row[col];
                } else {
                    // ...existing code xử lý các cột khác...
                }
            });
        });
        setTableData(targetTable);
    }

    return (
        <div>
            {/* Render table and other components */}
        </div>
    );
};

export default TableHandler;