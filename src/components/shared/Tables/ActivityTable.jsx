import React from 'react';
import { Table } from 'antd';

function ActivityTable({ components = {}, columns, data, bordered = false, pagination = false }) {
    return (
        <Table 
            components={components}
            dataSource={data} 
            columns={columns} 
            pagination={pagination} 
            scroll={{ x: 'max-content' }}
            bordered={bordered}
        />
    );
}

export default ActivityTable;
