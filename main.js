const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const express = require("express");
const path = require("path");
const { exec } = require("child_process");

let mainWindow;
const isServerMode = process.env.RENDER || false; // Detect if running on Render

if (isServerMode) {
    const serverApp = express();

    // Serve static files (index.html, CSS, JS) from root directory
    serverApp.use(express.static(__dirname));

    // Serve index.html when accessing "/"
    serverApp.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "index.html"));
    });

    // API Route for downloading MP3
    serverApp.post("/download", async (req, res) => {
        const { url } = req.body;
        if (!url) return res.status(400).send("No URL provided.");

        const command = `yt-dlp -x --audio-format mp3 -o "downloads/%(title)s.%(ext)s" "${url}"`;
        exec(command, (error) => {
            if (error) return res.status(500).send("Download failed.");
            res.send("Download started.");
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
                event.reply("download-status", error ? "Error" : "Success");
            });
        });
    });
}
