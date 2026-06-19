/* eslint-disable react/jsx-props-no-spreading */
import Card from '../Card';

function ChartCard({ 
    title,
    subtitle,
    chart,
    className = '',
    loading = false,
    ...props 
}) {
    return (
        <Card 
            className={`flex flex-col ${className}`} 
            loading={loading} 
            {...props}
        >
            <div className="flex flex-col flex-1">
                {title && (
                    <h4 className="text-base font-semibold flex items-center mb-4">
                        {title}
                    </h4>
                )}
                {subtitle && (
                    <p className="text-sm text-gray-500 mb-4">
                        {subtitle}
                    </p>
                )}
                <div className="flex-1">
                    {chart}
                </div>
            </div>
        </Card>
    );
}

export { ChartCard };