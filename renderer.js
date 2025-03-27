document.getElementById("download").addEventListener("click", () => {
    const url = document.getElementById("url").value;
    if (!url) return alert("Enter a valid URL");

    electron.downloadMP3(url);
});

electron.onDownloadStatus((status) => {
    document.getElementById("status").textContent = `Download ${status}`;
});
