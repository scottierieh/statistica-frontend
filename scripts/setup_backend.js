
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, 'venv');
const reqFile = path.join(backendDir, 'requirements.txt');
const pythonCmd = 'python3'; // Use python3 to be more generic
const pipCmd = path.join(venvDir, 'bin', 'pip');

function runPythonScript(scriptPath) {
    try {
        const fullScriptPath = path.join(backendDir, scriptPath);
        if (fs.existsSync(fullScriptPath)) {
            console.log(`Executing ${scriptPath}...`);
            execSync(`${path.join(venvDir, 'bin', 'python')} ${fullScriptPath}`, { cwd: backendDir, stdio: 'inherit' });
        } else {
            console.warn(`Warning: Script not found at ${fullScriptPath}, skipping execution.`);
        }
    } catch (error) {
        console.error(`Error executing ${scriptPath}:`, error.message);
        // Do not exit process, just log the error
    }
}


console.log('--- Setting up Python backend and generating data ---');

// Check if requirements.txt exists
if (!fs.existsSync(reqFile)) {
    console.log('requirements.txt not found. Skipping backend setup.');
    process.exit(0);
}

// Check if venv is already set up and up-to-date
const venvMarker = path.join(venvDir, '.setup_complete');
let venvNeedsSetup = true;

if (fs.existsSync(venvMarker)) {
    try {
        const reqMtime = fs.statSync(reqFile).mtime;
        const markerMtime = fs.statSync(venvMarker).mtime;
        if (markerMtime > reqMtime) {
            console.log('Python virtual environment is up-to-date.');
            venvNeedsSetup = false;
        } else {
            console.log('requirements.txt has been updated. Re-installing dependencies...');
        }
    } catch (e) {
        console.log('Could not check venv status, proceeding with setup.');
    }
}

if (venvNeedsSetup) {
    try {
        console.log('Virtual environment needs setup/update. Installing dependencies...');
        
        // 1. Create venv if it doesn't exist
        if (!fs.existsSync(venvDir)) {
            console.log('Creating virtual environment...');
            execSync(`${pythonCmd} -m venv ${venvDir}`, { cwd: backendDir, stdio: 'inherit' });
        }
        
        // 2. Install requirements
        console.log('Installing dependencies from requirements.txt...');
        execSync(`${pipCmd} install -r ${reqFile}`, { cwd: backendDir, stdio: 'inherit' });

        // 3. Create a marker file to indicate setup is complete
        fs.writeFileSync(venvMarker, new Date().toISOString());

        console.log('Python backend setup complete.');

    } catch (error) {
        console.error('Error setting up Python backend:', error);
        process.exit(1);
    }
}


// --- Generate Example Datasets ---
console.log('--- Generating example datasets. ---');
runPythonScript('ab_test_data.py');


console.log('--- Backend setup and data generation finished ---');
