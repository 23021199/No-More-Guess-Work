
const URL = "./Trash_Project/";
let model, webcam, maxPredictions;
let isWebcamActive = false;

// Initialize the application
async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Setup event listeners
        setupWebcamButton();
        setupFileUpload();

    } catch (error) {
        console.error('Error loading model:', error);
        showError('Error loading model: ' + error.message);
    }
}

// Webcam button functionality
function setupWebcamButton() {
    const button = document.getElementById('webcamButton');
    button.addEventListener('click', toggleWebcam);
}

async function toggleWebcam() {
    const button = document.getElementById('webcamButton');
    
    if (isWebcamActive) {
        // Stop webcam if active
        webcam.stop();
        resetPreviewContainer();
        button.textContent = 'Start Webcam';
        isWebcamActive = false;
        clearResults();
        return;
    }
    
    // Start webcam
    button.textContent = 'Loading...';
    button.disabled = true;
    clearError();

    try {
        const flip = true;
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup();
        await webcam.play();
        
        updatePreviewContainer(webcam.canvas);
        button.textContent = 'Stop Webcam';
        button.disabled = false;
        isWebcamActive = true;
        
        // Start prediction loop
        window.requestAnimationFrame(webcamLoop);
    } catch (error) {
        console.error('Webcam error:', error);
        button.textContent = 'Start Webcam';
        button.disabled = false;
        showError('Webcam error: ' + error.message);
    }
}

async function webcamLoop() {
    if (webcam && isWebcamActive) {
        webcam.update();
        await predict(webcam.canvas);
        window.requestAnimationFrame(webcamLoop);
    }
}

// File upload functionality
function setupFileUpload() {
    const fileInput = document.getElementById('fileUpload');
    fileInput.addEventListener('change', handleFileUpload);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Clear webcam if active
    if (isWebcamActive) {
        await toggleWebcam();
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const img = new Image();
        img.onload = async function() {
            // Create canvas for the uploaded image 
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            
            // Calculate dimensions to maintain aspect ratio
            const hRatio = canvas.width / img.width;
            const vRatio = canvas.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShiftX = (canvas.width - img.width * ratio) / 2;
            const centerShiftY = (canvas.height - img.height * ratio) / 2;
             
            ctx.drawImage(img, 0, 0, img.width, img.height,
                         centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
            
            updatePreviewContainer(canvas);
            await predict(canvas);
        };
        img.onerror = () => showError('Error loading image');
        img.src = e.target.result;
    };
    reader.onerror = () => showError('Error reading file');
    reader.readAsDataURL(file);
}

// Prediction function (works for both webcam and file upload)
async function predict(imageSource) {
    try {
        const prediction = await model.predict(imageSource);
        const recyclabilityInfo = determineRecyclability(prediction);
        updateUI(recyclabilityInfo, prediction);
    } catch (error) {
        console.error('Prediction error:', error);
        showError('Prediction error: ' + error.message);
    }
}

function determineRecyclability(predictions) {
    const recyclableClasses = ['Cardboard', 'Glass', 'Metal', 'Paper', 'Plastic'];
    
    let highestPrediction = predictions[0];
    for (let i = 1; i < predictions.length; i++) {
        if (predictions[i].probability > highestPrediction.probability) {
            highestPrediction = predictions[i];
        }
    }
    
    return {
        isRecyclable: recyclableClasses.includes(highestPrediction.className),
        className: highestPrediction.className,
        confidence: highestPrediction.probability
    };
}

function updateUI(recyclabilityInfo, predictions) {
    const recyclabilityElement = document.getElementById('recyclability');
    
    if (recyclabilityInfo.isRecyclable) {
        recyclabilityElement.textContent = `✅ Recyclable`;
        recyclabilityElement.className = 'fs-3 fw-bold my-3 text-success';
    } else {
        recyclabilityElement.textContent = '❌ Non-Recyclable';
        recyclabilityElement.className = 'fs-3 fw-bold my-3 text-danger';
    }
    
    // Update progress bars
    for (let i = 0; i < predictions.length; i++) {
        const className = predictions[i].className;
        const probability = predictions[i].probability;
        
        const progressElement = document.querySelector(`#${className}-progress`);
        const textElement = document.getElementById(className);
        
        if (progressElement && textElement) {
            progressElement.value = probability;
            textElement.innerHTML = (probability * 100).toFixed(2) + "%";
        }
    }
}

// Helper functions
function updatePreviewContainer(element) {
    const container = document.getElementById('webcam-container');
    container.innerHTML = '';
    container.appendChild(element);
}

function resetPreviewContainer() {
    const container = document.getElementById('webcam-container');
    container.innerHTML = '<span class="text-muted">Preview will appear here</span>';
}

function clearResults() {
    document.getElementById('recyclability').textContent = '';
    
    // Reset all progress bars
    const classes = ['Cardboard', 'Glass', 'Metal', 'Paper', 'Plastic', 'Trash'];
    classes.forEach(className => {
        const progressElement = document.querySelector(`#${className}-progress`);
        const textElement = document.getElementById(className);
        
        if (progressElement && textElement) {
            progressElement.value = 0;
            textElement.innerHTML = "0%";
        }
    });
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
}

function clearError() {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = '';
    errorElement.classList.add('d-none');
}

init();