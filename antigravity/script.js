// --- Statistical Distributions ---

class Distribution {
    sample() {
        throw new Error("Method 'sample' must be implemented.");
    }
}

class Uniform extends Distribution {
    constructor(min, max) {
        super();
        this.min = min;
        this.max = max;
    }

    sample() {
        return Math.random() * (this.max - this.min) + this.min;
    }
}

class Normal extends Distribution {
    constructor(mean, stdDev) {
        super();
        this.mean = mean;
        this.stdDev = stdDev;
    }

    // Box-Muller transform
    sample() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return this.mean + z * this.stdDev;
    }
}

class LogNormal extends Distribution {
    constructor(mu, sigma) {
        super();
        this.mu = mu;
        this.sigma = sigma;
    }

    sample() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return Math.exp(this.mu + z * this.sigma);
    }

    static fromConfidenceInterval(low, high, confidence = 0.90) {
        // Assumes low and high are the (1-confidence)/2 and 1-(1-confidence)/2 percentiles
        // e.g., for 90% CI, low is 5th percentile, high is 95th percentile
        const logLow = Math.log(low);
        const logHigh = Math.log(high);
        const z = 1.645; // Approximate Z-score for 90% CI (5% and 95%)

        const mu = (logLow + logHigh) / 2;
        const sigma = (logHigh - logLow) / (2 * z);
        return new LogNormal(mu, sigma);
    }
}

// PERT Distribution (Beta distribution scaled to min/max)
class PERT extends Distribution {
    constructor(min, mode, max, lambda = 4) {
        super();
        this.min = min;
        this.mode = mode;
        this.max = max;
        this.range = max - min;

        // Calculate Alpha and Beta parameters for the Beta distribution
        this.alpha = 1 + lambda * (mode - min) / this.range;
        this.beta = 1 + lambda * (max - mode) / this.range;
    }

    sample() {
        // Sampling from Gamma distribution to generate Beta
        const x = this._gamma(this.alpha);
        const y = this._gamma(this.beta);
        const betaSample = x / (x + y);
        return this.min + betaSample * this.range;
    }

    // Marsaglia and Tsang's method for Gamma distribution
    _gamma(alpha) {
        if (alpha < 1) {
            return this._gamma(1 + alpha) * Math.pow(Math.random(), 1 / alpha);
        }
        const d = alpha - 1 / 3;
        const c = 1 / Math.sqrt(9 * d);
        while (true) {
            let x, v;
            do {
                x = this._randn();
                v = 1 + c * x;
            } while (v <= 0);
            v = v * v * v;
            const u = Math.random();
            if (u < 1 - 0.0331 * x * x * x * x) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
    }

    _randn() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
}


// --- App State & Logic ---

const state = {
    variables: [], // Array of variable objects { id, name, type, params }
    results: []
};

// --- UI Components ---

function createVariableCard(variable) {
    const card = document.createElement('div');
    card.className = 'variable-card';
    card.dataset.id = variable.id;

    card.innerHTML = `
        <div class="card-header">
            <input type="text" class="variable-name-input" value="${variable.name}" placeholder="Variable Name">
            <button class="remove-btn" onclick="removeVariable('${variable.id}')">&times;</button>
        </div>
        <div class="card-body">
            <select class="type-select" onchange="updateVariableType('${variable.id}', this.value)">
                <option value="Normal" ${variable.type === 'Normal' ? 'selected' : ''}>Bell Curve (Normal)</option>
                <option value="Uniform" ${variable.type === 'Uniform' ? 'selected' : ''}>Simple Range (Uniform)</option>
                <option value="LogNormal" ${variable.type === 'LogNormal' ? 'selected' : ''}>Estimated Range (90% CI)</option>
                <option value="PERT" ${variable.type === 'PERT' ? 'selected' : ''}>Three-Point Estimate (PERT)</option>
                <option value="Constant" ${variable.type === 'Constant' ? 'selected' : ''}>Constant</option>
                <option value="Formula" ${variable.type === 'Formula' ? 'selected' : ''}>Formula</option>
            </select>
            <div class="params-container" id="params-${variable.id}">
                ${renderParams(variable)}
            </div>
        </div>
    `;

    // Add event listeners for inputs to update state
    const nameInput = card.querySelector('.variable-name-input');
    nameInput.addEventListener('input', (e) => {
        const v = state.variables.find(v => v.id === variable.id);
        if (v) v.name = e.target.value;
    });

    return card;
}

function renderParams(variable) {
    let html = '';
    if (variable.type === 'Normal') {
        html += createParamInput(variable.id, 'mean', 'Mean', variable.params.mean || 0);
        html += createParamInput(variable.id, 'stdDev', 'Std Dev', variable.params.stdDev || 1);
    } else if (variable.type === 'Uniform') {
        html += createParamInput(variable.id, 'min', 'Min', variable.params.min || 0);
        html += createParamInput(variable.id, 'max', 'Max', variable.params.max || 10);
    } else if (variable.type === 'LogNormal') {
        html += createParamInput(variable.id, 'low', 'Low (5%)', variable.params.low || 1);
        html += createParamInput(variable.id, 'high', 'High (95%)', variable.params.high || 10);
    } else if (variable.type === 'PERT') {
        html += createParamInput(variable.id, 'min', 'Min', variable.params.min || 0);
        html += createParamInput(variable.id, 'mode', 'Mode', variable.params.mode || 5);
        html += createParamInput(variable.id, 'max', 'Max', variable.params.max || 10);
    } else if (variable.type === 'Constant') {
        html += createParamInput(variable.id, 'value', 'Value', variable.params.value || 0);
    } else if (variable.type === 'Formula') {
        html += `<div class="param-group" style="flex: 1;">
            <label>Expression</label>
            <input type="text" class="param-input" style="width: 100%;" 
                value="${variable.params.expression || ''}" 
                onchange="updateParam('${variable.id}', 'expression', this.value)"
                placeholder="e.g. Var1 * Var2">
        </div>`;
    }
    return html;
}

function createParamInput(varId, paramKey, label, value) {
    return `
        <div class="param-group">
            <label>${label}</label>
            <input type="number" class="param-input" 
                value="${value}" 
                onchange="updateParam('${varId}', '${paramKey}', parseFloat(this.value))">
        </div>
    `;
}

// --- Actions ---

function addVariable() {
    const id = 'var_' + Date.now();
    const newVar = {
        id: id,
        name: 'Variable ' + (state.variables.length + 1),
        type: 'LogNormal',
        params: { low: 1, high: 10 }
    };
    state.variables.push(newVar);
    renderVariables();
}

function removeVariable(id) {
    state.variables = state.variables.filter(v => v.id !== id);
    renderVariables();
}

function updateVariableType(id, newType) {
    const v = state.variables.find(v => v.id === id);
    if (v) {
        v.type = newType;
        v.params = {}; // Reset params
        // Set defaults
        if (newType === 'Normal') { v.params = { mean: 0, stdDev: 1 }; }
        else if (newType === 'Uniform') { v.params = { min: 0, max: 10 }; }
        else if (newType === 'LogNormal') { v.params = { low: 1, high: 10 }; }
        else if (newType === 'PERT') { v.params = { min: 0, mode: 5, max: 10 }; }
        else if (newType === 'Constant') { v.params = { value: 0 }; }
        else if (newType === 'Formula') { v.params = { expression: '' }; }

        const paramsContainer = document.getElementById(`params-${id}`);
        if (paramsContainer) {
            paramsContainer.innerHTML = renderParams(v);
        }
    }
}

function updateParam(id, key, value) {
    const v = state.variables.find(v => v.id === id);
    if (v) {
        v.params[key] = value;
    }
}

function renderVariables() {
    const container = document.getElementById('variables-container');
    container.innerHTML = '';
    state.variables.forEach(v => {
        container.appendChild(createVariableCard(v));
    });
}

// --- Simulation Engine ---

function runSimulation() {
    const iterations = 10000;
    const results = [];

    // 1. Instantiate distributions
    const dists = {};
    state.variables.forEach(v => {
        if (v.type === 'Normal') dists[v.name] = new Normal(v.params.mean, v.params.stdDev);
        else if (v.type === 'Uniform') dists[v.name] = new Uniform(v.params.min, v.params.max);
        else if (v.type === 'LogNormal') dists[v.name] = LogNormal.fromConfidenceInterval(v.params.low, v.params.high);
        else if (v.type === 'PERT') dists[v.name] = new PERT(v.params.min, v.params.mode, v.params.max);
        else if (v.type === 'Constant') dists[v.name] = { sample: () => v.params.value };
    });

    // 2. Identify formula variables
    const formulas = state.variables.filter(v => v.type === 'Formula');

    try {
        for (let i = 0; i < iterations; i++) {
            const context = {};

            // Sample independent variables
            state.variables.forEach(v => {
                if (v.type !== 'Formula') {
                    context[v.name] = dists[v.name].sample();
                }
            });

            // Topological sort for formulas
            const sortedFormulas = [];
            const visited = new Set();
            const tempVisited = new Set();

            const visit = (varName) => {
                if (tempVisited.has(varName)) throw new Error(`Circular dependency detected involving ${varName}`);
                if (visited.has(varName)) return;

                tempVisited.add(varName);

                const v = state.variables.find(v => v.name === varName);
                if (v && v.type === 'Formula') {
                    // Find dependencies (simple regex to find variable names)
                    // This is a naive approach; mathjs has parse to find nodes, but regex might suffice for simple names
                    // Better: use math.parse(v.params.expression).filter(node => node.isSymbolNode).map(node => node.name)
                    try {
                        const node = math.parse(v.params.expression);
                        node.traverse(child => {
                            if (child.isSymbolNode && state.variables.some(sv => sv.name === child.name)) {
                                visit(child.name);
                            }
                        });
                    } catch (e) {
                        console.warn("Failed to parse dependencies for", varName);
                    }
                }

                tempVisited.delete(varName);
                visited.add(varName);
                if (v && v.type === 'Formula') sortedFormulas.push(v);
            };

            formulas.forEach(f => {
                if (!visited.has(f.name)) visit(f.name);
            });

            // Evaluate in sorted order
            sortedFormulas.forEach(f => {
                try {
                    context[f.name] = math.evaluate(f.params.expression, context);
                } catch (e) {
                    console.error(`Error evaluating ${f.name}:`, e);
                    context[f.name] = NaN;
                }
            });

            // We assume the LAST variable is the result we care about for the chart
            // Or we could let user select. For now, let's plot the last variable.
            if (state.variables.length > 0) {
                const lastVar = state.variables[state.variables.length - 1];
                results.push(context[lastVar.name]);
            }
        }

        updateResults(results);
        state.results = results; // Save results to state
        document.getElementById('download-csv-btn').disabled = false;

    } catch (err) {
        alert("Simulation error: " + err.message);
    }
}

function updateResults(data) {
    // Filter out NaNs
    const validData = data.filter(d => !isNaN(d) && isFinite(d)).sort((a, b) => a - b);

    if (validData.length === 0) return;

    // Calculate Stats
    const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
    const median = validData[Math.floor(validData.length / 2)];
    const p05 = validData[Math.floor(validData.length * 0.05)];
    const p95 = validData[Math.floor(validData.length * 0.95)];

    document.getElementById('stat-mean').textContent = formatNumber(mean);
    document.getElementById('stat-median').textContent = formatNumber(median);
    document.getElementById('stat-ci').textContent = `${formatNumber(p05)} - ${formatNumber(p95)}`;

    renderChart(validData, p05, p95);
}

function formatNumber(num) {
    if (Math.abs(num) < 0.01 && num !== 0) {
        return num.toExponential(2);
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

let chartInstance = null;

function renderChart(data, p05, p95) {
    const ctx = document.getElementById('results-chart').getContext('2d');

    // Create histogram bins
    const binCount = 50;
    const min = data[0];
    const max = data[data.length - 1];
    const binWidth = (max - min) / binCount;

    const bins = new Array(binCount).fill(0);
    const labels = new Array(binCount).fill(0);

    data.forEach(val => {
        let binIndex = Math.floor((val - min) / binWidth);
        if (binIndex >= binCount) binIndex = binCount - 1;
        bins[binIndex]++;
    });

    for (let i = 0; i < binCount; i++) {
        labels[i] = formatNumber(min + (i + 0.5) * binWidth);
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    const inkColor = '#264653';
    const tealColor = 'rgba(42, 157, 143, 0.7)';
    const mustardColor = 'rgba(233, 196, 106, 0.9)';

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequency',
                data: bins,
                backgroundColor: labels.map((l, i) => {
                    const val = min + (i + 0.5) * binWidth;
                    return (val >= p05 && val <= p95) ? mustardColor : tealColor;
                }),
                borderColor: inkColor,
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: inkColor,
                    titleFont: { family: 'Courier Prime' },
                    bodyFont: { family: 'Courier Prime' },
                    callbacks: {
                        title: (items) => `Value: ${items[0].label}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10,
                        color: inkColor,
                        font: { family: 'Courier Prime' }
                    },
                    grid: { display: false },
                    border: { display: true, color: inkColor }
                },
                y: {
                    ticks: { display: false },
                    grid: { display: false },
                    border: { display: false }
                }
            },
            animation: { duration: 0 }
        }
    });
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-variable-btn').addEventListener('click', addVariable);
    document.getElementById('load-example-btn').addEventListener('click', loadExample);
    document.getElementById('save-btn').addEventListener('click', saveModel);
    document.getElementById('load-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('file-input').addEventListener('change', loadModel);
    document.getElementById('run-simulation-btn').addEventListener('click', runSimulation);
    document.getElementById('download-csv-btn').addEventListener('click', downloadCSV);
    document.getElementById('help-btn').addEventListener('click', startWalkthrough);
    document.getElementById('reset-btn').addEventListener('click', () => {
        state.variables = [];
        state.results = [];
        document.getElementById('download-csv-btn').disabled = true;
        renderVariables();
    });

    // Add initial example variable if empty
    if (state.variables.length === 0) addVariable();

    // Check if we should show the walkthrough
    if (!localStorage.getItem('hasSeenWalkthrough')) {
        // Small delay to ensure rendering
        setTimeout(startWalkthrough, 500);
    }
});

function saveModel() {
    if (state.variables.length === 0) {
        alert("No variables to save.");
        return;
    }

    const data = JSON.stringify(state.variables, null, 2);

    // Use File System Access API if available
    if (window.showSaveFilePicker) {
        (async () => {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'fermi_estimation.json',
                    types: [{
                        description: 'JSON File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(data);
                await writable.close();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    alert("Error saving file: " + err.message);
                }
            }
        })();
        return;
    }

    // Fallback
    let filename = prompt("Enter filename to save:", "fermi_estimation");
    if (!filename) return; // User cancelled
    if (!filename.endsWith('.json')) filename += '.json';

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function loadModel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const variables = JSON.parse(e.target.result);
            if (Array.isArray(variables)) {
                state.variables = variables;
                state.results = []; // Clear previous results
                document.getElementById('download-csv-btn').disabled = true;
                renderVariables();
            } else {
                alert("Invalid file format.");
            }
        } catch (err) {
            alert("Error parsing file: " + err.message);
        }
        // Reset input so same file can be selected again
        event.target.value = '';
    };
    reader.readAsText(file);
}

function downloadCSV() {
    if (!state.results || state.results.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8,"
        + "Value\n"
        + state.results.join("\n");

    // Use File System Access API if available
    if (window.showSaveFilePicker) {
        (async () => {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'posterior_distribution.csv',
                    types: [{
                        description: 'CSV File',
                        accept: { 'text/csv': ['.csv'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(state.results.join("\n")); // Writing raw content, not data URI
                await writable.close();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    alert("Error saving file: " + err.message);
                }
            }
        })();
        return;
    }

    // Fallback
    let filename = prompt("Enter filename for CSV export:", "posterior_distribution");
    if (!filename) return; // User cancelled
    if (!filename.endsWith('.csv')) filename += '.csv';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function startWalkthrough() {
    const driver = window.driver.js.driver;

    const driverObj = driver({
        showProgress: true,
        steps: [
            { element: 'header', popover: { title: 'Welcome', description: 'This tool helps you make probabilistic estimates using Monte Carlo simulations.' } },
            { element: '#add-variable-btn', popover: { title: 'Add Variables', description: 'Start by adding variables. You can define them as distributions (like Normal, Uniform) or Constants.' } },
            { element: '#load-example-btn', popover: { title: 'Load Example', description: 'Click here to load a sample problem (Piano Tuners in Chicago) to see how it works.' } },
            { element: '#save-btn', popover: { title: 'Save/Load', description: 'You can save your model to a JSON file and load it back later.' } },
            { element: '#variables-container', popover: { title: 'Workspace', description: 'Your variables will appear here. You can define formulas that reference other variables by name.' } },
            { element: '#run-simulation-btn', popover: { title: 'Run Simulation', description: 'Once your model is ready, click here to run 10,000 simulations.' } },
            { element: '.results-card', popover: { title: 'Results', description: 'The results will show a histogram of the outcomes along with key statistics like Mean and Confidence Intervals.' } },
            { element: '#download-csv-btn', popover: { title: 'Export', description: 'You can download the raw simulation data as a CSV file for further analysis.' } }
        ],
        onDestroyStarted: () => {
            if (!localStorage.getItem('hasSeenWalkthrough')) {
                if (confirm("Don't show this walkthrough again?")) {
                    localStorage.setItem('hasSeenWalkthrough', 'true');
                }
            }
            driverObj.destroy();
        }
    });

    driverObj.drive();
}

function loadExample() {
    state.variables = [
        { id: 'v1', name: 'Population', type: 'Uniform', params: { min: 2500000, max: 3000000 } },
        { id: 'v2', name: 'PersonsPerHousehold', type: 'Uniform', params: { min: 2, max: 3 } },
        { id: 'v3', name: 'HouseholdsWithPiano', type: 'Uniform', params: { min: 0.05, max: 0.10 } },
        { id: 'v4', name: 'TuningsPerYear', type: 'Uniform', params: { min: 0.5, max: 1 } },
        { id: 'v5', name: 'TuningsPerTuner', type: 'Uniform', params: { min: 500, max: 1000 } },
        { id: 'v6', name: 'TotalTunings', type: 'Formula', params: { expression: '(Population / PersonsPerHousehold) * HouseholdsWithPiano * TuningsPerYear' } },
        { id: 'v7', name: 'TunersNeeded', type: 'Formula', params: { expression: 'TotalTunings / TuningsPerTuner' } }
    ];
    renderVariables();
}

// Expose functions to global scope for inline event handlers
window.removeVariable = removeVariable;
window.updateVariableType = updateVariableType;
window.updateParam = updateParam;
