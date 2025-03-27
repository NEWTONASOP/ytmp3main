const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000; // Render will set PORT automatically

app.post("/download", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: "URL is required" });
    }

    // Get video title for correct filename
    exec(`yt-dlp --print filename -o "%(title)s.%(ext)s" "${url}"`, (err, stdout) => {
        if (err) {
            return res.status(500).json({ message: "Error fetching filename" });
        }

        const fileName = stdout.trim().replace(/[^a-zA-Z0-9.-]/g, "_") + ".mp3";
        const outputPath = path.join(__dirname, "downloads", fileName);

        // Ensure 'downloads' folder exists
        if (!fs.existsSync("downloads")) fs.mkdirSync("downloads");

        // Download the file
        exec(`yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`, (err) => {
            if (err) {
                return res.status(500).json({ message: "Download failed" });
            }

            res.json({ message: "Download completed", fileName });
        });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
