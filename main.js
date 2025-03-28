const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from root directory

// Ensure downloads directory exists
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)){
    fs.mkdirSync(downloadDir);
}

// Route to serve the main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Download endpoint
app.post("/download", async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: "No URL provided." });
    }

    try {
        // Generate a unique filename
        const timestamp = Date.now();
        const outputTemplate = path.join(downloadDir, `%(title)s_${timestamp}.%(ext)s`);
        
        // Download command with full path
        const command = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Download error:', stderr);
                return res.status(500).json({ error: "Download failed." });
            }

            // Find the downloaded file
            const fileNameMatch = stdout.match(/\[ExtractAudio\] Destination: (.+)/);
            if (!fileNameMatch) {
                return res.status(500).json({ error: "Could not determine downloaded file." });
            }

            const downloadedFilePath = fileNameMatch[1];
            const fileName = path.basename(downloadedFilePath);

            res.json({ 
                message: "Download started", 
                fileName: fileName,
                downloadUrl: `/downloads/${fileName}`
            });
        });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: "Server error during download." });
    }
});

// Serve downloaded files
app.get('/downloads/:filename', (req, res) => {
    const filePath = path.join(downloadDir, req.params.filename);
    
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send('File not found');
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
