const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const cors = require("cors");

let mainWindow;
const isServerMode = process.env.RENDER || false; // Detect if running on Render

if (isServerMode) {
    const serverApp = express();
    serverApp.use(cors()); // Allow frontend to access backend
    serverApp.use(express.json()); // Enable JSON body parsing
    serverApp.use(express.static(__dirname)); // Serve index.html and assets

    serverApp.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "index.html"));
    });

    serverApp.post("/download", async (req, res) => {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "No URL provided." });

        const outputTemplate = "%(title)s.%(ext)s";
        const command = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                return res.status(500).json({ error: "Download failed." });
            }

            // Extract file name from stdout
            const match = stdout.match(/\[ExtractAudio\] Destination: (.+)/);
            const filename = match ? match[1] : "output.mp3";
            const fileUrl = `${req.protocol}://${req.get("host")}/${filename}`;

            res.json({ message: "Download started", fileUrl });
        });
    });

    const PORT = process.env.PORT || 3000;
    serverApp.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
    app.whenReady().then(() => {
        mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        mainWindow.loadFile("index.html");

        ipcMain.on("close-app", () => mainWindow.close());
        ipcMain.on("minimize-app", () => mainWindow.minimize());
        ipcMain.on("download-mp3", async (event, url) => {
            const { filePath } = await dialog.showSaveDialog({
                title: "Save MP3",
                defaultPath: "download.mp3",
                filters: [{ name: "MP3 Files", extensions: ["mp3"] }]
            });

            if (!filePath) return event.reply("download-status", "Cancelled");

            const command = `yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}"`;
            exec(command, (error) => {
                if (error) return event.reply("download-status", "Error");
                event.reply("download-status", "Success");
            });
        });
    });
}
