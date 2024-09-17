    import * as skinview3d from 'https://cdn.jsdelivr.net/npm/skinview3d@latest/dist/skinview3d.module.js';
    // Import socket.io-client from CDN
    import { io } from 'https://cdn.socket.io/4.0.0/socket.io.esm.min.js';

    // Connect to your Glitch backend
    const socket = io('https://ember-phantom-margin.glitch.me');

const container = document.getElementById('skin-viewer');
const downloadButton = document.getElementById('download');
const inputField = document.getElementById('username');
downloadButton.disabled = true;
let skinURL = "";
let selectedSkinURL = "";
const fileInput = document.querySelector('input[type="file"]');
let timeoutId = null;


const overlayContainer = document.getElementById("overlay_elements");
const tagsContainer = document.getElementById("tag-container");

let paintEntries = document.querySelectorAll('.paint-type.card .paint-entry');

socket.on('viewerCount', (count) => {
    document.getElementById('viewerCount').textContent = count;
});

window.onclose = function (e) {
    socket.disconnect();
};

window.onbeforeunload = function(e) {
    socket.disconnect();
};

// Fetch overlays.json using Fetch API
fetch('./src/overlays/overlays.json')
    .then(response => response.json())
    .then(overlays => {
        // Use the overlay data here
        overlays.forEach(item => {
            const div = document.createElement("div");
            const filter = item.filter ? item.filter : "none";
            div.id = item.id + ":" + filter;
            div.className = "paint-entry";
            div.innerHTML = `<h2>${item.title}</h2>`;
            overlayContainer.appendChild(div);
            addPreviewSkinClickListener(div);
        });
    })
    .catch(error => console.error('Error loading overlays:', error));

// Fetch tags.json similarly
fetch('./src/overlays/tags.json')
    .then(response => response.json())
    .then(tags => {
        tags.forEach(item => {
            const button = document.createElement("btn");
            button.className = "tag-button"
            button.id = "tag-" + item.toLowerCase();
            button.textContent = item;
            tagsContainer.appendChild(button);
        });
    })
    .catch(error => console.error('Error loading tags:', error));

function addPreviewSkinClickListener(paintEntry) {
    paintEntry.addEventListener('click', async () => {

        if ((!selectedSkinURL || selectedSkinURL === "") && (!fileInput.files || !fileInput.files.length)) {
            showNotification("Please upload a skin or type your name in first");
            return;
        }

        let formData = new FormData();
        let file;

        if (selectedSkinURL && selectedSkinURL !== "") {
            file = await urlToFile(selectedSkinURL);
        } else if (fileInput.files && fileInput.files.length) {
            file = fileInput.files[0];
        } else {
            showNotification("Please upload a skin or type your name in first");
            return;
        }
        showNotification("Converting skin...", 0);
        formData.append('skinFile', file);

        // Use your Glitch backend URL for the API call
        fetch('https://ember-phantom-margin.glitch.me/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const skinName = data.filename;

                    fetch('https://ember-phantom-margin.glitch.me/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            skinName: skinName,
                            overlayName: paintEntry.id.split(":")[0],
                            filter: paintEntry.id.split(":")[1]
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                skinURL = data.url;
                                skinViewer.loadSkin(skinURL);
                                downloadButton.disabled = false;
                                showNotification("Skin with overlay " + paintEntry.id.split(":")[0] + " was generated!", 1);
                                paintEntries = document.querySelectorAll('.paint-type.card .paint-entry');
                                paintEntries.forEach(p => {
                                    p.classList.remove("selected");
                                });

                                paintEntry.classList.add("selected");
                            } else {
                                showNotification("Could not generate your skin!");
                            }
                        })
                        .catch(error => {
                            console.error(error);
                            showNotification("Could not generate your skin!");
                        });
                } else {
                    showNotification("Could not upload your skin!");
                }
            })
            .catch(error => {
                console.error(error);
                showNotification("Could not upload your skin!");
            });
    });
}

const skinViewer = new skinview3d.SkinViewer({
    canvas: container,
    width: 300,
    height: 500,
    skin: "https://mineskin.eu/skin/steve",  // Use Minotar or another skin API
    enableControls: true
});

skinViewer.zoom = 0.7;
skinViewer.controls.enableZoom = false;
skinViewer.autoRotate = true;
skinViewer.autoRotateSpeed = 0.5;
skinViewer.animation = new skinview3d.RunningAnimation();
skinViewer.animation.speed = 0.7;

setTimeout(() => {
    container.style.opacity = '1';
    container.style.transform = 'translate(0rem, 0rem)';
}, 50);

setTimeout(() => {
    skinViewer.animation.speed = 0.1;
}, 1000 * 1.6);

inputField.addEventListener('input', (event) => {
    clearTimeout(timeoutId);

    const inputValue = event.target.value;

    if (inputValue.length > 16) {
        showNotification("Username is too long!");
        event.target.value = inputValue.slice(0, 16);
        return;
    }

    if (/[^a-zA-Z0-9_]/.test(inputValue)) {
        event.target.value = inputValue.replace(/[^a-zA-Z0-9]/g, '');
        showNotification("Only letters and numbers are allowed!");
        return;
    }

    timeoutId = setTimeout(() => {

        if(!inputValue) {
            showNotification("Empty input!");
            return;
        }

        if (inputValue.length <= 2) {
            showNotification("Username is too short!");
            event.target.value = inputValue.slice(0, 16);
            return;
        }

        const url = "https://mineskin.eu/skin/" + inputValue;
        clearFileInput(fileInput);
        selectedSkinURL = url;
        skinViewer.loadSkin(url);
        downloadButton.disabled = true;
        skinURL = "";
    }, 500);
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/png')) {
            showNotification("Selected file is not a PNG.");
            clearFileInput(event.target);
            return;
        }

        if (file.size > 100 * 1024) {
            showNotification("Selected file size exceeds the 100kb limit.");
            clearFileInput(event.target);
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const skinDataUrl = e.target.result;
            skinViewer.loadSkin(skinDataUrl);
            downloadButton.disabled = true;
            inputField.value = '';
            skinURL = "";
            selectedSkinURL = "";
        };
        reader.readAsDataURL(file);
    }
});

function clearFileInput(input) {
    input.value = '';
}

downloadButton.addEventListener('click', function() {
    if (skinURL && skinURL !== "") {
        downloadImage(skinURL);
    } else {
        showNotification("Could not find requested Skin! Generate a new one.");
    }
});

async function downloadImage(imageSrc) {
    const image = await fetch(imageSrc);
    const imageBlog = await image.blob();
    const imageURL = URL.createObjectURL(imageBlog);

    const link = document.createElement('a');
    link.href = imageURL;
    link.download = 'Overlay-Skin-' + Date.now();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showNotification(message, type = 2) {
    const notificationContainer = document.getElementById('notification-container');
    const notificationWrapper = document.createElement('div');
    notificationWrapper.classList.add('notification-wrapper');

    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;

    switch (type) {
        case 0:
            notification.classList.add('info');
            break;
        case 1:
            notification.classList.add('success');
            break;
        case 2:
            notification.classList.add('error');
    }

    notificationWrapper.appendChild(notification);
    notificationContainer.appendChild(notificationWrapper);

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'scale(1, 1)';
    }, 100);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0, 0)';
        setTimeout(() => {
            notificationWrapper.remove();
        }, 500);
    }, 3000);
}

async function urlToFile(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                resolve(new File([blob], 'image.png', { type: 'image/png' }));
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
    });
}
