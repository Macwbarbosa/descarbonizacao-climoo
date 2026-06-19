/* eslint-disable react/jsx-props-no-spreading */
import { useState } from 'react';
import { Tooltip, Switch } from 'antd';
import { Info } from '@phosphor-icons/react';
import Card from '../Card';

function StatCard({ 
    icon, 
    title, 
    value, 
    unit = '', 
    tooltipInfo = null, 
    hasSwitch = false, 
    switchOptions = [],
    className = '',
    ...props 
}) {
    const [isSwitched, setIsSwitched] = useState(false);

    const handleSwitchChange = (checked) => {
        setIsSwitched(checked);
    };

    const currentTitle = isSwitched && hasSwitch ? switchOptions[1].title : title;
    const currentValue = isSwitched && hasSwitch ? switchOptions[1].value : value;
    const currentUnit = isSwitched && hasSwitch ? switchOptions[1].unit : unit;

    return (
        <Card className={`stat-card ${className}`} {...props}>
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    <h4 className="text-base font-semibold flex items-center">
                        {currentTitle}
                        {tooltipInfo && (
                            <Tooltip title={tooltipInfo}>
                                <span className="ml-2 text-xs cursor-pointer">
                                    <Info size={18} weight="bold" />
                                </span>
                            </Tooltip>
                        )}
                    </h4>
                </div>

                {hasSwitch && (
                    <Switch 
                        size="small"
                        onChange={handleSwitchChange}
                        aria-label="Toggle information display"
                    />
                )}
            </div>

            <div className="flex items-center mt-2">
                {icon && (
                    <div className="stat-icon bg-purple-100 text-purple-800 flex items-center justify-center rounded-full w-8 h-8 mr-2">
                        {icon}
                    </div>
                )}
                <p className="text-2xl font-semibold">{currentValue}</p>
                {currentUnit && (
                    <span className="text-sm text-gray-600 ml-1">
                        {currentUnit}
                    </span>
                )}
            </div>
        </Card>
    );
}

export { StatCard };