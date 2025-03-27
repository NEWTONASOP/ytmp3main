const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false, // Remove default frame
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
        if (!url) {
            event.reply("download-status", "Invalid URL");
            return;
        }

        event.reply("download-status", "Started..."); // Show status before fetching title

        // Step 1: Get the video title first
        exec(`yt-dlp --get-title "${url}"`, async (error, stdout) => {
            if (error) {
                event.reply("download-status", "Failed to fetch title");
                return;
            }

            // Step 2: Clean the title for safe filenames
            const videoTitle = stdout.trim().replace(/[/\\?%*:|"<>]/g, ""); 

            // Step 3: Show the save dialog with the correct title
            const { filePath } = await dialog.showSaveDialog({
                title: "Save MP3",
                defaultPath: `${videoTitle}.mp3`,
                filters: [{ name: "MP3 Files", extensions: ["mp3"] }]
            });

            if (!filePath) {
                event.reply("download-status", "Cancelled");
                return;
            }

            // Step 4: Download using yt-dlp
            const command = `yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}"`;
            exec(command, (err) => {
                event.reply("download-status", err ? "Error" : "Download Complete ✅");
            });
        });
    });
});
