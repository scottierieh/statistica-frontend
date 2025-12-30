// lib/example-datasets.ts
// Manufacturing Example Datasets

export interface ExampleDataSet {
    id: string;
    name: string;
    description: string;
    data: string; // CSV format
}

// Generate realistic manufacturing data
const generateManufacturingData = (): string => {
    const headers = [
        'batch_id',
        'timestamp',
        'production_units',
        'defect_rate',
        'temperature_c',
        'pressure_psi',
        'humidity_pct',
        'vibration_hz',
        'power_consumption_kw',
        'cycle_time_sec',
        'operator_id'
    ];

    const rows: string[] = [headers.join(',')];
    
    // Generate 200 data points
    const baseDate = new Date('2025-01-01T08:00:00');
    
    for (let i = 0; i < 200; i++) {
        const batchId = `B${String(1001 + i).padStart(4, '0')}`;
        
        // Timestamp (hourly batches)
        const timestamp = new Date(baseDate.getTime() + i * 3600000);
        const timestampStr = timestamp.toISOString();
        
        // Production units: normally distributed around 100
        const productionUnits = Math.round(100 + (Math.random() - 0.5) * 20 + Math.sin(i / 20) * 5);
        
        // Temperature: affects defect rate
        const baseTemp = 72 + (Math.random() - 0.5) * 10;
        const temperature = Math.round(baseTemp * 10) / 10;
        
        // Pressure: normally around 45 PSI
        const pressure = Math.round((45 + (Math.random() - 0.5) * 8) * 10) / 10;
        
        // Humidity: 40-60%
        const humidity = Math.round((50 + (Math.random() - 0.5) * 20) * 10) / 10;
        
        // Vibration: increases over time (tool wear simulation)
        const baseVibration = 12 + (i / 200) * 3;
        const vibration = Math.round((baseVibration + (Math.random() - 0.5) * 4) * 10) / 10;
        
        // Power consumption
        const power = Math.round((85 + (Math.random() - 0.5) * 15) * 10) / 10;
        
        // Cycle time
        const cycleTime = Math.round((45 + (Math.random() - 0.5) * 10) * 10) / 10;
        
        // Defect rate: correlated with temperature and vibration
        const tempEffect = Math.max(0, (temperature - 75) * 0.002);
        const vibrationEffect = Math.max(0, (vibration - 14) * 0.003);
        const baseDefectRate = 0.02 + tempEffect + vibrationEffect + (Math.random() - 0.5) * 0.01;
        const defectRate = Math.round(Math.max(0.005, Math.min(0.08, baseDefectRate)) * 1000) / 1000;
        
        // Operator ID (3 shifts)
        const operatorId = `OP${String(101 + (i % 3)).padStart(3, '0')}`;
        
        rows.push([
            batchId,
            timestampStr,
            productionUnits,
            defectRate,
            temperature,
            pressure,
            humidity,
            vibration,
            power,
            cycleTime,
            operatorId
        ].join(','));
    }
    
    return rows.join('\n');
};

// Generate quality control data with some out-of-control points
const generateQualityControlData = (): string => {
    const headers = [
        'sample_id',
        'measurement_time',
        'dimension_mm',
        'weight_g',
        'surface_roughness',
        'hardness_hrc',
        'tensile_strength_mpa',
        'machine_id',
        'material_batch'
    ];

    const rows: string[] = [headers.join(',')];
    
    for (let i = 0; i < 150; i++) {
        const sampleId = `S${String(5001 + i).padStart(5, '0')}`;
        const timestamp = new Date(Date.now() - (150 - i) * 1800000).toISOString();
        
        // Dimension: target 25.00mm, tolerance ±0.05
        let dimension = 25.00 + (Math.random() - 0.5) * 0.08;
        // Add some out-of-control points
        if (i === 45 || i === 89 || i === 123) {
            dimension += (Math.random() > 0.5 ? 1 : -1) * 0.1;
        }
        dimension = Math.round(dimension * 1000) / 1000;
        
        // Weight: target 150g
        const weight = Math.round((150 + (Math.random() - 0.5) * 5) * 100) / 100;
        
        // Surface roughness: Ra value
        const roughness = Math.round((1.6 + (Math.random() - 0.5) * 0.4) * 100) / 100;
        
        // Hardness
        const hardness = Math.round((58 + (Math.random() - 0.5) * 4) * 10) / 10;
        
        // Tensile strength
        const tensile = Math.round(450 + (Math.random() - 0.5) * 30);
        
        // Machine ID
        const machineId = `M${String(1 + (i % 4)).padStart(2, '0')}`;
        
        // Material batch
        const materialBatch = `MAT-${String(2025001 + Math.floor(i / 30)).padStart(7, '0')}`;
        
        rows.push([
            sampleId,
            timestamp,
            dimension,
            weight,
            roughness,
            hardness,
            tensile,
            machineId,
            materialBatch
        ].join(','));
    }
    
    return rows.join('\n');
};

// Generate OEE (Overall Equipment Effectiveness) data
const generateOEEData = (): string => {
    const headers = [
        'date',
        'shift',
        'machine_id',
        'planned_production_time_min',
        'actual_run_time_min',
        'ideal_cycle_time_sec',
        'actual_cycle_time_sec',
        'total_units',
        'good_units',
        'defect_units',
        'downtime_min',
        'downtime_reason'
    ];

    const rows: string[] = [headers.join(',')];
    const machines = ['CNC-01', 'CNC-02', 'CNC-03', 'PRESS-01', 'PRESS-02'];
    const shifts = ['Morning', 'Afternoon', 'Night'];
    const downtimeReasons = ['None', 'Maintenance', 'Material Change', 'Tool Change', 'Breakdown', 'Setup'];
    
    const baseDate = new Date('2025-01-01');
    
    for (let day = 0; day < 30; day++) {
        const currentDate = new Date(baseDate.getTime() + day * 86400000);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        for (const shift of shifts) {
            for (const machine of machines) {
                const plannedTime = 480; // 8 hours
                const downtime = Math.round(Math.random() * 60);
                const actualRunTime = plannedTime - downtime;
                
                const idealCycle = machine.startsWith('CNC') ? 45 : 30;
                const actualCycle = idealCycle + Math.round((Math.random() - 0.3) * 10);
                
                const totalUnits = Math.round(actualRunTime * 60 / actualCycle);
                const defectUnits = Math.round(totalUnits * (0.01 + Math.random() * 0.03));
                const goodUnits = totalUnits - defectUnits;
                
                const reason = downtime > 30 ? downtimeReasons[Math.floor(Math.random() * 5) + 1] : 'None';
                
                rows.push([
                    dateStr,
                    shift,
                    machine,
                    plannedTime,
                    actualRunTime,
                    idealCycle,
                    actualCycle,
                    totalUnits,
                    goodUnits,
                    defectUnits,
                    downtime,
                    reason
                ].join(','));
            }
        }
    }
    
    return rows.join('\n');
};

export const exampleDatasets: ExampleDataSet[] = [
    {
        id: 'manufacturing-process',
        name: 'Manufacturing Process Data',
        description: 'Production batch data with environmental factors and quality metrics. Includes temperature, pressure, vibration, and defect rates.',
        data: generateManufacturingData()
    },
    {
        id: 'quality-control',
        name: 'Quality Control Measurements',
        description: 'Dimensional and material property measurements for SPC analysis. Contains some out-of-control data points.',
        data: generateQualityControlData()
    },
    {
        id: 'oee-data',
        name: 'OEE Performance Data',
        description: 'Overall Equipment Effectiveness data across multiple machines and shifts. 30 days of production records.',
        data: generateOEEData()
    }
];

export default exampleDatasets;