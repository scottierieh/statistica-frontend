const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, 'venv');
const reqFile = path.join(backendDir, 'requirements.txt');
const venvMarker = path.join(venvDir, '.setup_complete'); // Marker file for successful setup
const reqCopyFile = path.join(venvDir, 'requirements.txt.bak'); // Copy of last installed requirements
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
    
    // If the success marker doesn't exist, we must reinstall.
    if (!fs.existsSync(venvMarker)) {
        console.log("Virtual environment setup marker not found. A new setup is required.");
        return true;
    }

    // If marker exists, check if requirements have changed.
    if (!fs.existsSync(reqCopyFile)) {
        console.log("Requirements backup not found. Re-installing to be safe.");
        return true;
    }

    try {
        const currentReqs = fs.readFileSync(reqFile, 'utf-8');
        const lastInstalledReqs = fs.readFileSync(reqCopyFile, 'utf-8');
        
        if (currentReqs.trim() !== lastInstalledReqs.trim()) {
            console.log("requirements.txt has been modified since the last setup. Re-installing dependencies.");
            return true;
        }
    } catch (e) {
        console.error("Could not read requirements files. Forcing reinstall.", e);
        return true;
    }

    return false;
}


console.log('--- Setting up Python backend ---');

if (shouldReinstall()) {
    try {
        if (fs.existsSync(venvDir)) {
             console.log(`Removing existing virtual environment at ${venvDir} due to changed requirements...`);
             fs.rmSync(venvDir, { recursive: true, force: true });
        }

        // 1. Create venv
        console.log(`Creating virtual environment at ${venvDir}...`);
        execSync(`${pythonCmd} -m venv ${venvDir}`, { cwd: backendDir, stdio: 'inherit' });
        
        // 2. Install requirements with --prefer-binary to speed up installation
        console.log(`Installing dependencies from ${reqFile}...`);
        execSync(`${pipCmd} install --prefer-binary --no-cache-dir -r ${reqFile}`, { cwd: backendDir, stdio: 'inherit' });

        // 3. Create a copy of requirements.txt for future comparison
        fs.copyFileSync(reqFile, reqCopyFile);
        
        // 4. Touch the marker file to indicate a successful setup
        fs.writeFileSync(venvMarker, `Setup completed on: ${new Date().toISOString()}`);

        console.log('Python backend setup complete.');

    } catch (error) {
        console.error('Error setting up Python backend:', error);
        process.exit(1);
    }
} else {
    console.log('Virtual environment is up-to-date. Skipping dependency installation.');
}


console.log('--- Backend setup finished ---');