const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, 'venv');
const reqFile = path.join(backendDir, 'requirements.txt');
const venvMarker = path.join(venvDir, '.setup_complete'); // Marker file
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

function getFileHash(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const hash = require('crypto').createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
}

console.log('--- Setting up Python backend and generating data ---');

// Check if requirements.txt exists
if (!fs.existsSync(reqFile)) {
    console.log('requirements.txt not found. Skipping backend setup.');
    process.exit(0);
}

const reqHash = getFileHash(reqFile);
const oldReqHash = fs.existsSync(venvMarker) ? fs.readFileSync(venvMarker, 'utf-8') : null;

// Re-install if venv doesn't exist OR if requirements.txt has changed.
if (!fs.existsSync(venvDir) || reqHash !== oldReqHash) {
    try {
        if(fs.existsSync(venvDir)) {
            console.log('requirements.txt has changed. Re-installing dependencies...');
            // A more robust solution might be to upgrade pip packages, 
            // but removing and recreating is simpler and more reliable in this context.
            fs.rmSync(venvDir, { recursive: true, force: true });
        } else {
            console.log('Virtual environment not found. Setting up...');
        }

        // 1. Create venv
        console.log(`Creating virtual environment at ${venvDir}...`);
        execSync(`${pythonCmd} -m venv ${venvDir}`, { cwd: backendDir, stdio: 'inherit' });
        
        // 2. Install requirements
        console.log(`Installing dependencies from ${reqFile}...`);
        execSync(`${pipCmd} install -r ${reqFile}`, { cwd: backendDir, stdio: 'inherit' });

        // 3. Write new hash to marker file
        fs.writeFileSync(venvMarker, reqHash);

        console.log('Python backend setup complete.');

    } catch (error) {
        console.error('Error setting up Python backend:', error);
        process.exit(1);
    }
} else {
    console.log('Virtual environment is up-to-date. Skipping setup.');
}


// --- Generate Example Datasets ---
console.log('--- Generating example datasets. ---');
runPythonScript('ab_test_data.py');


console.log('--- Backend setup and data generation finished ---');
