// Utility functions for handling Excel file import/export in Emissions Inventory
import ExcelJS from 'exceljs';

/**
 * Generates and downloads an XLSX template for emissions inventory with dropdowns
 * @param {string} filename - Name of the file to download
 * @param {Array} reductionGoals - Array of reduction goals for dropdown
 * @param {Array} projections - Array of projections for anchorage dropdown
 */
export const downloadEmissionsTemplate = async (filename = 'modelo_inventario_emissoes.xlsx', reductionGoals = [], projections = []) => {
    try {
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();

        // Create main worksheet
        const worksheet = workbook.addWorksheet('Inventário Emissões');

        // Define headers
        const headers = ['Escopo', 'Categoria', 'Atividade', 'Emissão tCO2e', 'Meta', 'Ancoragem'];

        // Add headers to first row
        worksheet.addRow(headers);

        // Format header row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
            Object.assign(cell, {
                font: { bold: true, size: 11, name: 'Calibri' },
                alignment: { horizontal: 'center', vertical: 'middle' },
                fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE8F4FD' }
                },
                border: {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                }
            });
        });

        // Set column widths
        worksheet.columns = [
            { width: 12 }, // Escopo
            { width: 45 }, // Categoria  
            { width: 35 }, // Atividade
            { width: 15 }, // Emissão tCO2e
            { width: 20 }, // Meta
            { width: 20 }  // Ancoragem
        ];

        // Add sample data
        const sampleData = [
            ['Escopo 1', 'Combustão estacionária', 'Exemplo: Caldeiras', 100, '', ''],
            ['Escopo 2', 'Energia elétrica - Método baseado na Localização', 'Consumo de energia elétrica', 200, '', ''],
            ['Escopo 3', 'Compra de bens e serviços', 'Exemplo: Materiais de escritório', 50, '', ''],
            ['Escopo 1', 'Combustão móvel', 'Exemplo: Frota de veículos', 150, '', ''],
            ['Escopo 3', 'Viagens a negócios', 'Exemplo: Viagens aéreas', 75, '', ''],
        ];

        sampleData.forEach(rowData => {
            worksheet.addRow(rowData);
        });

        // Create dropdown validations if data is available
        if (reductionGoals.length > 0 || projections.length > 0) {
            // Create hidden data sheet for dropdowns
            const dataSheet = workbook.addWorksheet('_DropdownData');
            dataSheet.state = 'hidden';

            // Create mapping sheet for IDs (also hidden)
            const mappingSheet = workbook.addWorksheet('_IDMapping');
            mappingSheet.state = 'hidden';

            // Add goals data
            if (reductionGoals.length > 0) {
                const goalOptions = reductionGoals.map(goal =>
                    goal.goalName || goal.name || `${goal.scope ? `Escopo ${goal.scope}` : 'Meta'} - ${goal.reductionValue || goal.reduction_percentage || 0}%`
                );

                goalOptions.forEach((goalName, index) => {
                    // Add goal name to dropdown data
                    dataSheet.getCell(`A${index + 1}`).value = goalName;
                    // Add goal ID mapping (goal name -> goal ID)
                    mappingSheet.getCell(`A${index + 1}`).value = goalName;
                    mappingSheet.getCell(`B${index + 1}`).value = reductionGoals[index].id;
                });

                // Add headers to mapping sheet
                mappingSheet.getCell('A1').value = 'Nome da Meta';
                mappingSheet.getCell('B1').value = 'ID da Meta';

                // Create validation for Meta column (E)
                const goalRange = `_DropdownData!$A$1:$A$${goalOptions.length}`;
                worksheet.dataValidations.add('E2:E100', {
                    type: 'list',
                    allowBlank: true,
                    formulae: [goalRange],
                    showDropDown: true,
                    showErrorMessage: true,
                    showInputMessage: true,
                    error: 'Por favor, selecione uma meta da lista.',
                    errorTitle: 'Meta Inválida',
                    errorStyle: 'stop',
                    prompt: 'Selecione uma meta de redução da lista ou deixe em branco.',
                    promptTitle: 'Meta de Redução'
                });
            }

            // Add projections data
            if (projections.length > 0) {
                const projectionOptions = projections.map(projection =>
                    projection.name || projection.parameter || 'Parâmetro'
                );

                const startRow = reductionGoals.length > 0 ? reductionGoals.length + 3 : 1; // Deixar espaço entre seções

                projectionOptions.forEach((projectionName, index) => {
                    // Add projection name to dropdown data
                    dataSheet.getCell(`B${index + 1}`).value = projectionName;
                    // Add projection ID mapping (projection name -> projection ID)
                    mappingSheet.getCell(`C${startRow + index}`).value = projectionName;
                    mappingSheet.getCell(`D${startRow + index}`).value = projections[index].id;
                });

                // Add headers to mapping sheet for projections
                if (startRow === 1) {
                    mappingSheet.getCell('C1').value = 'Nome da Ancoragem';
                    mappingSheet.getCell('D1').value = 'ID da Ancoragem';
                } else {
                    mappingSheet.getCell(`C${startRow - 1}`).value = 'Nome da Ancoragem';
                    mappingSheet.getCell(`D${startRow - 1}`).value = 'ID da Ancoragem';
                }

                // Create validation for Ancoragem column (F)
                const projectionRange = `_DropdownData!$B$1:$B$${projectionOptions.length}`;
                worksheet.dataValidations.add('F2:F100', {
                    type: 'list',
                    allowBlank: true,
                    formulae: [projectionRange],
                    showDropDown: true,
                    showErrorMessage: true,
                    showInputMessage: true,
                    error: 'Por favor, selecione uma ancoragem da lista.',
                    errorTitle: 'Ancoragem Inválida',
                    errorStyle: 'stop',
                    prompt: 'Selecione um parâmetro de ancoragem da lista ou deixe em branco.',
                    promptTitle: 'Ancoragem'
                });
            }
        }        // Generate Excel file buffer
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // Create blob and download
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);

    } catch (error) {
        throw new Error(`Erro ao gerar template: ${error.message}`);
    }
};

/**
 * Parses a CSV or XLSX file and returns emission inventory data
 * @param {File} file - The CSV or XLSX file to parse
 * @param {Array} reductionGoals - Array of reduction goals for name-to-ID conversion
 * @param {Array} projections - Array of projections for name-to-ID conversion
 * @returns {Promise<Array>} - Array of emission inventory items
 */
export const parseEmissionsCSV = (file, reductionGoals = [], projections = []) => new Promise((resolve, reject) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();

    // Helper function to convert goal name to ID
    const getGoalIdByName = (goalName) => {
        if (!goalName) return '';
        const goal = reductionGoals.find(g => {
            const name = g.goalName || g.name || `${g.scope ? `Escopo ${g.scope}` : 'Meta'} - ${g.reductionValue || g.reduction_percentage || 0}%`;
            return name === goalName.toString().trim();
        });
        return goal ? goal.id : goalName; // Se não encontrar, manter o valor original
    };

    // Helper function to convert projection name to ID
    const getProjectionIdByName = (projectionName) => {
        if (!projectionName) return '';
        const projection = projections.find(p => {
            const name = p.name || p.parameter || 'Parâmetro';
            return name === projectionName.toString().trim();
        });
        return projection ? projection.id : projectionName; // Se não encontrar, manter o valor original
    };

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel files
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(data);

                // Get the first worksheet
                const worksheet = workbook.getWorksheet(1);

                if (!worksheet) {
                    throw new Error('Planilha não encontrada no arquivo');
                }

                // Convert to array of arrays
                const jsonData = [];
                worksheet.eachRow((row) => {
                    const rowValues = [];
                    row.eachCell((cell, colNumber) => {
                        rowValues[colNumber - 1] = cell.value;
                    });
                    jsonData.push(rowValues);
                });

                // Skip header row and filter empty rows
                const dataRows = jsonData.slice(1).filter(row =>
                    row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')
                );

                const emissionItems = dataRows.map((row, index) => {
                    if (row.length < 4) {
                        throw new Error(`Linha ${index + 2}: dados insuficientes (encontradas ${row.length} colunas, necessárias pelo menos 4)`);
                    }

                    const [scope, category, activity, emission, goal, anchorage] = row;

                    // Validate required fields
                    if (!scope || !category || !activity) {
                        throw new Error(`Linha ${index + 2}: campos obrigatórios faltando`);
                    }

                    // Validate emission value
                    const emissionValue = parseFloat(emission) || 0;
                    if (Number.isNaN(emissionValue) || emissionValue < 0) {
                        throw new Error(`Linha ${index + 2}: valor de emissão inválido (${emission})`);
                    }

                    return {
                        scope: scope.toString().trim(),
                        category: category.toString().trim(),
                        activity: activity.toString().trim(),
                        emission: emissionValue,
                        goal: getGoalIdByName(goal),
                        anchorage: getProjectionIdByName(anchorage)
                    };
                });

                resolve(emissionItems);
            } catch (error) {
                reject(new Error(`Erro ao processar arquivo Excel: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo Excel'));
        };

        reader.readAsArrayBuffer(file);
    } else {
        // Handle CSV files (existing logic)
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                let csvText = e.target.result;

                // Remove BOM if present
                if (csvText.charCodeAt(0) === 0xFEFF) {
                    csvText = csvText.slice(1);
                }

                // Split by line breaks (handle both \r\n and \n)
                const lines = csvText.split(/\r\n|\n|\r/);

                // Skip header row and filter empty lines
                const dataLines = lines.slice(1).filter(line => line.trim());

                const emissionItems = dataLines.map((line, index) => {
                    // Simple CSV parser that handles quoted fields
                    const columns = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < line.length; i += 1) {
                        const char = line[i];

                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                // Double quote escape
                                current += '"';
                                i += 1; // Skip next quote
                            } else {
                                // Toggle quote state
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            // Field separator
                            columns.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }

                    // Add the last column
                    columns.push(current.trim());

                    if (columns.length < 4) {
                        throw new Error(`Linha ${index + 2}: dados insuficientes (encontradas ${columns.length} colunas, necessárias pelo menos 4)`);
                    }

                    const [scope, category, activity, emission, goal, anchorage] = columns;

                    // Validate required fields
                    if (!scope || !category || !activity) {
                        throw new Error(`Linha ${index + 2}: campos obrigatórios faltando`);
                    }

                    // Validate emission value
                    const emissionValue = parseFloat(emission) || 0;
                    if (Number.isNaN(emissionValue) || emissionValue < 0) {
                        throw new Error(`Linha ${index + 2}: valor de emissão inválido (${emission})`);
                    }

                    return {
                        scope: scope.trim(),
                        category: category.trim(),
                        activity: activity.trim(),
                        emission: emissionValue,
                        goal: getGoalIdByName(goal),
                        anchorage: getProjectionIdByName(anchorage)
                    };
                });

                resolve(emissionItems);
            } catch (error) {
                reject(new Error(`Erro ao processar arquivo CSV: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo CSV'));
        };

        reader.readAsText(file, 'UTF-8');
    }
});

/**
 * Validates if the scope and category combination is valid
 * @param {string} scope - The emission scope
 * @param {string} category - The emission category
 * @returns {boolean} - Whether the combination is valid
 */
export const validateScopeCategory = (scope, category) => {
    const SCOPES = {
        "Escopo 1": [
            "Atividades agrícolas",
            "Combustão estacionária",
            "Combustão móvel",
            "Efluentes",
            "Emissões fugitivas",
            "Emissões fugitivas não quioto",
            "Mudança no Uso do Solo",
            "Processos industriais",
            "Resíduos"
        ],
        "Escopo 2": [
            "Energia elétrica - Método baseado na Localização",
            "Energia elétrica - Método baseado no mercado"
        ],
        "Escopo 3": [
            "Compra de bens e serviços",
            "Bens de capital",
            "Outras emissões do ciclo de vida de combustíveis e eletricidade",
            "Transporte e Distribuição (upstream)",
            "Resíduos",
            "Viagens a negócios",
            "Deslocamento de funcionários",
            "Bens arrendados (upstream)",
            "Transporte e Distribuição (downstream)",
            "Processamento de produtos vendidos",
            "Uso de bens e serviços vendidos",
            "Tratamento de fim de vida dos produtos vendidos",
            "Bens arrendados (a organização como arrendadora)",
            "Franquias",
            "Investimentos",
            "Outras emissões não categorizadas no Escopo 3"
        ]
    };

    const validCategories = SCOPES[scope];
    return validCategories && validCategories.includes(category);
};

/**
 * Exports emission inventory data to XLSX
 * @param {Array} emissionData - Array of emission inventory items
 * @param {string} filename - Name of the file to download
 */
export const exportEmissionsToCSV = async (emissionData, filename = 'inventario_emissoes_exportado.xlsx') => {
    if (!emissionData || emissionData.length === 0) {
        throw new Error('Nenhum dado para exportar');
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventário Emissões');

    // Define headers
    const headers = ['Escopo', 'Categoria', 'Atividade', 'Emissão tCO2e', 'Meta', 'Ancoragem'];

    // Add headers to worksheet
    worksheet.addRow(headers);

    // Add data rows
    emissionData.forEach(item => {
        worksheet.addRow([
            item.scope || '',
            item.category || '',
            item.activity || '',
            item.emission || 0,
            item.goal || '',
            item.anchorage || ''
        ]);
    });

    // Set column widths for better readability
    worksheet.getColumn(1).width = 12; // Escopo
    worksheet.getColumn(2).width = 45; // Categoria
    worksheet.getColumn(3).width = 35; // Atividade
    worksheet.getColumn(4).width = 15; // Emissão tCO2e
    worksheet.getColumn(5).width = 20; // Meta
    worksheet.getColumn(6).width = 20; // Ancoragem

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8F4FD' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
