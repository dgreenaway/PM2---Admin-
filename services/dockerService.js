const { execFile } = require('child_process');

function getContainers() {
  return new Promise((resolve) => {
    // Use a JSON-safe format template — each field is individually quoted
    const fmt = '{"id":"{{.ID}}","name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","state":"{{.State}}","ports":"{{.Ports}}"}';
    execFile('docker', ['ps', '-a', '--format', fmt], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve({ available: false, containers: [] });
        return;
      }
      try {
        const containers = stdout
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        resolve({ available: true, containers });
      } catch {
        resolve({ available: true, containers: [] });
      }
    });
  });
}

module.exports = { getContainers };
