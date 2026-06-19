/* eslint-disable react/jsx-props-no-spreading */
import { Card as AntCard } from 'antd';
import './styles.css';

function Card({ 
    children, 
    className = '', 
    bordered = false,
    hoverable = false,
    loading = false,
    size = 'default',
    ...props 
}) {
    const baseClassName = `rounded-lg shadow-md ${hoverable ? 'hover:shadow-lg transition-shadow' : ''} ${className}`;

    return (
        <AntCard
            className={baseClassName}
            bordered={bordered}
            hoverable={hoverable}
            loading={loading}
            size={size}
            {...props}
        >
            {children}
        </AntCard>
    );
}

export default Card;