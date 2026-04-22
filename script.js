let currentFinalPath = "";
let currentTargetType = "";
let BASE_WIN = "";
let BASE_MAC = "";

// Initialize app on load
window.onload = () => {
    loadConfiguration();
};

function toggleConfig() {
    const content = document.getElementById("config-content");
    const arrow = document.getElementById("config-arrow");
    
    content.classList.toggle("collapsed");
    arrow.classList.toggle("collapsed");

    // Toggle body class based on whether it is collapsed
    if (content.classList.contains("collapsed")) {
        document.body.classList.remove("settings-open");
    } else {
        document.body.classList.add("settings-open");
    }
}

function loadConfiguration() {
    const savedWin = localStorage.getItem("UNC_CONVERTER_WIN");
    const savedMac = localStorage.getItem("UNC_CONVERTER_MAC");
    const autoOpen =
        localStorage.getItem("UNC_CONVERTER_AUTO_OPEN") === "true";

    document.getElementById("auto-open-checkbox").checked = autoOpen;

    if (savedWin && savedMac) {
        BASE_WIN = savedWin;
        BASE_MAC = savedMac;

        document.getElementById("win-example").value = BASE_WIN;
        document.getElementById("mac-example").value = BASE_MAC;

        document
            .getElementById("config-content")
            .classList.add("collapsed");
        document
            .getElementById("config-arrow")
            .classList.add("collapsed");
        document.body.classList.remove("settings-open");
    } else {
        document
            .getElementById("config-content")
            .classList.remove("collapsed");
        document
            .getElementById("config-arrow")
            .classList.remove("collapsed");
        document.body.classList.add("settings-open");
    }
}

function calculateBases(winPath, macPath) {
    let wParts = winPath
        .replace(/\\/g, "/")
        .split("/")
        .filter((p) => p.length > 0);
    let mParts = macPath.split("/").filter((p) => p.length > 0);

    let commonSuffix = [];
    let wLen = wParts.length;
    let mLen = mParts.length;
    let minLen = Math.min(wLen, mLen);

    for (let i = 1; i <= minLen; i++) {
        if (
            wParts[wLen - i].toLowerCase() ===
            mParts[mLen - i].toLowerCase()
        ) {
            commonSuffix.unshift(wParts[wLen - i]);
        } else {
            break;
        }
    }

    if (commonSuffix.length === 0) return null;

    let wBaseParts = wParts.slice(0, wLen - commonSuffix.length);
    let mBaseParts = mParts.slice(0, mLen - commonSuffix.length);

    let wBase = "\\\\" + wBaseParts.join("\\");
    let mBase = "/" + mBaseParts.join("/");

    return { wBase, mBase };
}

function clearConfigState() {
    localStorage.removeItem("UNC_CONVERTER_WIN");
    localStorage.removeItem("UNC_CONVERTER_MAC");
    BASE_WIN = "";
    BASE_MAC = "";
}

function attemptSaveConfiguration() {
    const winInputEl = document.getElementById("win-example");
    const macInputEl = document.getElementById("mac-example");
    const winInput = winInputEl.value
        .trim()
        .replace(/^["']|["']$/g, "");
    const macInput = macInputEl.value
        .trim()
        .replace(/^["']|["']$/g, "");

    // Prevent bypassing if both bases are currently empty
    if (winInput === BASE_WIN && macInput === BASE_MAC && BASE_WIN !== "") {
        return true;
    }

    // Explicit check for BOTH empty
    if (!winInput && !macInput) {
        clearConfigState();
        showError(
            "Missing example paths",
            "Please provide example Windows and macOS paths.",
        );
        return false;
    }

    // Check if only one is empty
    if (!winInput || !macInput) {
        clearConfigState();
        showError(
            "Configuration Error",
            "Please provide both Windows and macOS paths.",
        );
        return false;
    }

    const bases = calculateBases(winInput, macInput);
    if (!bases) {
        clearConfigState();
        showError(
            "Invalid Example Path",
            "Please check example path format.",
        );
        return false;
    }

    BASE_WIN = bases.wBase;
    BASE_MAC = bases.mBase;

    localStorage.setItem("UNC_CONVERTER_WIN", BASE_WIN);
    localStorage.setItem("UNC_CONVERTER_MAC", BASE_MAC);

    winInputEl.value = BASE_WIN;
    macInputEl.value = BASE_MAC;

    const content = document.getElementById("config-content");
    const arrow = document.getElementById("config-arrow");
    if (!content.classList.contains("collapsed")) {
        content.classList.add("collapsed");
        arrow.classList.add("collapsed");
        document.body.classList.remove("settings-open");
    }

    return true;
}

// Clears the manual input field
function clearManualInput() {
    const manualInput = document.getElementById("manual-path-input");
    manualInput.value = "";
    manualInput.focus();
}

async function processPath(targetType) {
    const outputEl = document.getElementById("output");
    const statusEl = document.getElementById("status");
    const openBtn = document.getElementById("open-btn");
    const manualInput = document.getElementById("manual-path-input");
    const manualInputWrapper = document.getElementById("manual-input-wrapper");

    openBtn.style.display = "none";
    statusEl.classList.remove("show");
    statusEl.innerText = "";

    if (!attemptSaveConfiguration()) {
        const content = document.getElementById("config-content");
        const arrow = document.getElementById("config-arrow");
        if (content.classList.contains("collapsed")) {
            content.classList.remove("collapsed");
            arrow.classList.remove("collapsed");
            document.body.classList.add("settings-open");
        }
        return;
    }

    let inputPath = "";
    let clipboardAccessible = false;

    // Check clipboard on EVERY convert attempt
    try {
        const clipboardText = await navigator.clipboard.readText();
        inputPath = clipboardText.trim().replace(/^["']|["']$/g, "");
        clipboardAccessible = true;
    } catch (cbErr) {
        console.warn("Clipboard read blocked by browser/OS.");
        clipboardAccessible = false;
    }

    // Toggle manual input wrapper visibility based on clipboard access
    if (clipboardAccessible) {
        manualInputWrapper.style.display = "none";
    } else {
        manualInputWrapper.style.display = "block";
        // Fallback to manual input if we can't read the clipboard
        if (manualInput.value.trim() !== "") {
            inputPath = manualInput.value
                .trim()
                .replace(/^["']|["']$/g, "");
        }
    }

    if (!inputPath) {
        if (!clipboardAccessible) {
            showError(
                "Clipboard Access Blocked",
                "Please allow clipboard access or paste the path \n manually.",
            );
            manualInput.focus();
        } else {
            showError(
                "Clipboard Empty",
                "Please copy a path first.",
            );
        }
        return;
    }

    try {
        let relativePath = "";
        const normalizedInput = inputPath
            .replace(/\\/g, "/")
            .toLowerCase();
        const normalizedWinBase = BASE_WIN.replace(
            /\\/g,
            "/",
        ).toLowerCase();
        const normalizedMacBase = BASE_MAC.toLowerCase();

        if (normalizedInput.startsWith(normalizedWinBase)) {
            relativePath = inputPath.substring(BASE_WIN.length);
        } else if (normalizedInput.startsWith(normalizedMacBase)) {
            relativePath = inputPath.substring(BASE_MAC.length);
        } else {
            showError(
                "Unknown Path Format",
                "Path format does not match the example path in setting.",
            );
            return;
        }

        relativePath = relativePath.replace(/^[\\\/]+/, "");

        let finalPath = "";
        if (targetType === "windows") {
            finalPath = `${BASE_WIN}\\${relativePath.replace(/\//g, "\\")}`;
        } else if (targetType === "mac") {
            finalPath = `${BASE_MAC}/${relativePath.replace(/\\/g, "/")}`;
            // Network formatting mapping
            finalPath = finalPath.replace(/TINA2-PC/i, "Volumes");
        }

        if (relativePath === "") {
            if (targetType === "windows") finalPath = BASE_WIN;
            if (targetType === "mac") {
                finalPath = BASE_MAC.replace(/TINA2-PC/i, "Volumes");
            }
        }

        currentFinalPath = finalPath;
        currentTargetType = targetType;

        outputEl.textContent = finalPath;
        outputEl.style.color = "var(--text-main)";

        try {
            await navigator.clipboard.writeText(finalPath);
            statusEl.textContent = "Copied to clipboard";
            statusEl.style.color = "var(--success)";
            statusEl.classList.add("show");
        } catch (e) {
            const textArea = document.createElement("textarea");
            textArea.value = finalPath;
            document.body.appendChild(textArea);
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);

            if (successful) {
                statusEl.textContent = "Copied to clipboard";
                statusEl.style.color = "var(--success)";
                statusEl.classList.add("show");
            } else {
                statusEl.textContent =
                    "Failed to copy automatically.";
                statusEl.style.color = "var(--error)";
                statusEl.classList.add("show");
            }
        }

        if (targetType === "mac") {
            openBtn.textContent = "Open in Finder";
        } else {
            openBtn.textContent = "Open in Explorer";
        }
        openBtn.style.display = "block";

        if (document.getElementById("auto-open-checkbox").checked) {
            openConvertedPath();
        }
    } catch (err) {
        console.error(err);
        showError(
            "Unknown Error",
            "Failed to convert the path.",
        );
    }
}

function showError(statusMsg, pathMsg = "") {
    const outputEl = document.getElementById("output");
    const statusEl = document.getElementById("status");
    const openBtn = document.getElementById("open-btn");

    openBtn.style.display = "none";

    outputEl.innerText = pathMsg || "";
    outputEl.style.color = pathMsg
        ? "var(--error)"
        : "var(--text-muted)";

    if (statusMsg) {
        statusEl.textContent = statusMsg;
        statusEl.style.color = "var(--error)";
        statusEl.classList.add("show");
    } else {
        statusEl.classList.remove("show");
    }
}

function closeModal() {
    document.getElementById("app-modal").classList.remove("active");
}

async function openConvertedPath() {
    const isTauri = !!window.__TAURI__;

    if (!isTauri) {
        document
            .getElementById("app-modal")
            .classList.add("active");
        return;
    }

    let pathToOpen = currentFinalPath;
    const lastSegment = pathToOpen.split(/[/\\]/).pop();

    if (lastSegment && lastSegment.includes(".")) {
        const slash = currentTargetType === "mac" ? "/" : "\\";
        const lastSlashIndex = pathToOpen.lastIndexOf(slash);
        if (lastSlashIndex > 0) {
            pathToOpen = pathToOpen.substring(0, lastSlashIndex);
        }
    }

    try {
        const { invoke } = window.__TAURI__.core;
        await invoke('open_path', { path: pathToOpen });
    } catch (err) {
        console.error("Failed to open path:", err);
        showError("Execution Error", "Error opening path.");
    }
}

document
    .getElementById("auto-open-checkbox")
    .addEventListener("change", (e) => {
        const isTauri = !!window.__TAURI__;
        if (e.target.checked && !isTauri) {
            e.target.checked = false;
            document
                .getElementById("app-modal")
                .classList.add("active");
        } else {
            localStorage.setItem(
                "UNC_CONVERTER_AUTO_OPEN",
                e.target.checked,
            );
        }
    });

document
    .getElementById("open-btn")
    .addEventListener("click", openConvertedPath);

async function getLatestReleases() {
    // Replace with your actual GitHub username and repository name
    const repoPath = "Oyzariah/win-mac-server-path-converter";
    const apiUrl = `https://api.github.com/repos/${repoPath}/releases/latest`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const releaseData = await response.json();
        let macLink = "";
        let winLink = "";

        // Loop through the attached files in the latest release
        releaseData.assets.forEach(asset => {
            // Find the Mac installer (.dmg)
            if (asset.name.endsWith(".dmg")) {
                macLink = asset.browser_download_url;
            }
            // Find the Windows installer (.exe or .msi)
            else if (asset.name.endsWith(".exe") || asset.name.endsWith(".msi")) {
                winLink = asset.browser_download_url;
            }
        });

        // Update the buttons with the direct download URLs
        if (macLink) {
            document.getElementById("mac-download-btn").href = macLink;
        }
        if (winLink) {
            document.getElementById("win-download-btn").href = winLink;
        }

    } catch (error) {
        console.error("Failed to fetch latest release links from GitHub:", error);
        // It will just fall back to the default href in the HTML if this happens
    }
}

// Run the function as soon as the webpage loads
document.addEventListener("DOMContentLoaded", getLatestReleases);