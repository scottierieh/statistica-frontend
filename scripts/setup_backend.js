const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..', 'backend');
const venvDir = path.join(backendDir, 'venv');
const reqFile = path.join(backendDir, 'requirements.txt');

console.log('--- Setting up Python backend ---');

// Check if requirements.txt exists
if (!fs.existsSync(reqFile)) {
    console.log('requirements.txt not found. Skipping backend setup.');
    process.exit(0);
}

// Check if venv is already set up and up-to-date
const venvMarker = path.join(venvDir, '.setup_complete');
const reqMtime = fs.statSync(reqFile).mtime;

let venvNeedsSetup = true;
if (fs.existsSync(venvMarker)) {
    const markerMtime = fs.statSync(venvMarker).mtime;
    if (markerMtime > reqMtime) {
        console.log('Python backend is already up-to-date.');
        venvNeedsSetup = false;
    }
}

if (venvNeedsSetup) {
    try {
        console.log('Virtual environment needs setup/update. Installing dependencies...');
        
        // Use python3 to be more generic
        const pythonCmd = 'python3';
        
        // 1. Create venv if it doesn't exist
        if (!fs.existsSync(venvDir)) {
            console.log('Creating virtual environment...');
            execSync(`${pythonCmd} -m venv ${venvDir}`, { cwd: backendDir, stdio: 'inherit' });
        }
        
        // 2. Install requirements
        const pipCmd = path.join(venvDir, 'bin', 'pip');
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

console.log('--- Python backend setup finished ---');
