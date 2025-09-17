
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, 'venv');
const reqFile = path.join(backendDir, 'requirements.txt');
const venvMarker = path.join(venvDir, '.setup_complete'); // Marker file to store last successful setup time
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
const pipCmd = process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'pip.exe') : path.join(venvDir, 'bin', 'pip');

function runPythonScript(scriptPath) {
    try {
        const fullScriptPath = path.join(backendDir, scriptPath);
        if (fs.existsSync(fullScriptPath)) {
            const pythonExecutable = process.platform === 'win32' ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python');
            console.log(`Executing ${scriptPath}...`);
            execSync(`${pythonExecutable} ${fullScriptPath}`, { cwd: backendDir, stdio: 'inherit' });
        } else {
            console.warn(`Warning: Script not found at ${fullScriptPath}, skipping execution.`);
        }
    } catch (error) {
        console.error(`Error executing ${scriptPath}:`, error.message);
        // Do not exit process, just log the error
    }
}

function shouldReinstall() {
    if (!fs.existsSync(reqFile)) {
        console.log('requirements.txt not found. Skipping backend setup.');
        return false;
    }
    if (!fs.existsSync(venvMarker)) {
        console.log("Virtual environment marker not found. A new setup is required.");
        return true;
    }

    try {
        const markerStat = fs.statSync(venvMarker);
        const reqStat = fs.statSync(reqFile);
        
        if (reqStat.mtime > markerStat.mtime) {
            console.log("requirements.txt has been modified since the last setup. Re-installing dependencies.");
            // Force removal of the venv directory to ensure a clean install
            if (fs.existsSync(venvDir)) {
                console.log(`Removing existing virtual environment at ${venvDir}...`);
                fs.rmSync(venvDir, { recursive: true, force: true });
            }
            return true;
        }
    } catch (e) {
        console.error("Could not check file stats. Forcing reinstall.", e);
        return true;
    }

    return false;
}

console.log('--- Setting up Python backend and generating data ---');

if (shouldReinstall() || !fs.existsSync(venvDir)) {
    try {
        if (fs.existsSync(venvDir)) {
             console.log(`Removing existing virtual environment at ${venvDir}...`);
             fs.rmSync(venvDir, { recursive: true, force: true });
        }

        // 1. Create venv
        console.log(`Creating virtual environment at ${venvDir}...`);
        execSync(`${pythonCmd} -m venv ${venvDir}`, { cwd: backendDir, stdio: 'inherit' });
        
        // 2. Install requirements
        console.log(`Installing dependencies from ${reqFile}...`);
        execSync(`${pipCmd} install -r ${reqFile}`, { cwd: backendDir, stdio: 'inherit' });

        // 3. Touch the marker file to update its timestamp
        if (!fs.existsSync(venvDir)) {
            fs.mkdirSync(venvDir, { recursive: true });
        }
        const now = new Date();
        fs.writeFileSync(venvMarker, `Setup completed on: ${now.toISOString()}`);

        console.log('Python backend setup complete.');

    } catch (error) {
        console.error('Error setting up Python backend:', error);
        // Exit if setup fails, as subsequent scripts will likely fail too.
        process.exit(1);
    }
} else {
    console.log('Virtual environment is up-to-date. Skipping dependency installation.');
}


// --- Generate Example Datasets ---
console.log('--- Generating example datasets. ---');
runPythonScript('ab_test_data.py');


console.log('--- Backend setup and data generation finished ---');
