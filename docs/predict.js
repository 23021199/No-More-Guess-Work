// Configuration constants
const CONFIG = {
    MODEL_URL: './Trash_Project/model.json',
    METADATA_URL: './Trash_Project/metadata.json',
    CANVAS_SIZE: {
        MOBILE: 300,
        DESKTOP: 400
    },
    RECYCLABLE_CLASSES: ['Cardboard', 'Glass', 'Metal', 'Paper', 'Plastic'],
    ALL_CLASSES: ['Cardboard', 'Glass', 'Metal', 'Paper', 'Plastic', 'Trash'],
    ERROR_TIMEOUT: 5000,
    WEBCAM_OPTIONS: {
        facingMode: 'environment'
    }
};

// Main application class
class RecyclabilityDetector {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.maxPredictions = 0;
        this.isWebcamActive = false;
        this.isMobile = this.detectMobile();
        this.elements = {};
        this.animationFrameId = null;
        
        this.init();
    }

    // More reliable mobile detection
    detectMobile() {
        return window.matchMedia('(max-width: 768px)').matches || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
    }

    // Cache DOM elements
    cacheElements() {
        const elementIds = [
            'webcamButton', 'fileUpload', 'webcam-container', 
            'recyclability', 'error-message'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`Element with id '${id}' not found`);
            }
        });

        // Cache file upload label
        this.elements.fileLabel = document.querySelector('label[for="fileUpload"]');
        
        // Cache progress elements
        this.elements.progress = {};
        CONFIG.ALL_CLASSES.forEach(className => {
            this.elements.progress[className] = {
                bar: document.getElementById(`${className}-progress`),
                text: document.getElementById(className)
            };
        });
    }

    // Initialize the application
    async init() {
        try {
            this.cacheElements();
            await this.loadModel();
            this.setupEventListeners();
            this.applyMobileOptimizations();
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }

    // Load the ML model
    async loadModel() {
        if (!window.tmImage) {
            throw new Error('Teachable Machine library not loaded');
        }

        this.model = await tmImage.load(CONFIG.MODEL_URL, CONFIG.METADATA_URL);
        this.maxPredictions = this.model.getTotalClasses();
        console.log(`Model loaded with ${this.maxPredictions} classes`);
    }

    // Setup all event listeners
    setupEventListeners() {
        // Webcam button
        if (this.elements.webcamButton) {
            this.elements.webcamButton.addEventListener('click', () => this.toggleWebcam());
            
            if (!this.hasWebcamSupport()) {
                this.elements.webcamButton.disabled = true;
                this.elements.webcamButton.textContent = 'Webcam Not Supported';
                this.showError('Webcam access is not supported on this device');
            }
        }

        // File upload
        if (this.elements.fileUpload) {
            this.elements.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    // Check webcam support
    hasWebcamSupport() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    // Apply mobile-specific optimizations
    applyMobileOptimizations() {
        if (!this.isMobile) return;

        // Adjust container
        if (this.elements['webcam-container']) {
            Object.assign(this.elements['webcam-container'].style, {
                width: '100%',
                maxWidth: '400px',
                margin: '0 auto'
            });
        }

        // Make buttons touch-friendly
        document.querySelectorAll('button').forEach(button => {
            Object.assign(button.style, {
                padding: '12px 24px',
                fontSize: '16px'
            });
        });

        // Adjust file upload label
        if (this.elements.fileLabel) {
            Object.assign(this.elements.fileLabel.style, {
                padding: '12px 24px',
                display: 'inline-block'
            });
        }
    }

    // Toggle webcam on/off
    async toggleWebcam() {
        if (this.isWebcamActive) {
            await this.stopWebcam();
        } else {
            await this.startWebcam();
        }
    }

    // Start webcam
    async startWebcam() {
        const button = this.elements.webcamButton;
        
        this.setButtonState(button, 'Loading...', true);
        this.clearError();

        try {
            const canvasSize = this.isMobile ? CONFIG.CANVAS_SIZE.MOBILE : CONFIG.CANVAS_SIZE.DESKTOP;
            
            this.webcam = new tmImage.Webcam(canvasSize, canvasSize, true);
            await this.webcam.setup(CONFIG.WEBCAM_OPTIONS);
            await this.webcam.play();
            
            this.updatePreviewContainer(this.webcam.canvas);
            this.setButtonState(button, 'Stop Webcam', false);
            this.isWebcamActive = true;
            
            this.startWebcamLoop();
        } catch (error) {
            this.handleWebcamError(error);
            this.setButtonState(button, 'Start Webcam', false);
        }
    }

    // Stop webcam
    async stopWebcam() {
        if (this.webcam) {
            this.webcam.stop();
            this.webcam = null;
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.resetPreviewContainer();
        this.setButtonState(this.elements.webcamButton, 'Start Webcam', false);
        this.isWebcamActive = false;
        this.clearResults();
    }

    // Webcam prediction loop
    startWebcamLoop() {
        const loop = async () => {
            if (this.webcam && this.isWebcamActive) {
                this.webcam.update();
                await this.predict(this.webcam.canvas);
                this.animationFrameId = requestAnimationFrame(loop);
            }
        };
        loop();
    }

    // Handle file upload
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Stop webcam if active
        if (this.isWebcamActive) {
            await this.stopWebcam();
        }

        const originalText = this.elements.fileLabel?.textContent || 'Choose File';
        this.setLabelText('Processing...');

        try {
            const canvas = await this.processImageFile(file);
            this.updatePreviewContainer(canvas);
            await this.predict(canvas);
        } catch (error) {
            this.handleError('File processing failed', error);
        } finally {
            this.setLabelText(originalText);
        }
    }

    // Process uploaded image file
    async processImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    try {
                        const canvas = this.createCanvasFromImage(img);
                        resolve(canvas);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Create canvas from image with proper scaling
    createCanvasFromImage(img) {
        const canvas = document.createElement('canvas');
        const canvasSize = this.isMobile ? CONFIG.CANVAS_SIZE.MOBILE : CONFIG.CANVAS_SIZE.DESKTOP;
        
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        
        const ctx = canvas.getContext('2d');
        
        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        // Clear canvas and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        return canvas;
    }

    // Make prediction on image
    async predict(imageSource) {
        try {
            const predictions = await this.model.predict(imageSource);
            const recyclabilityInfo = this.determineRecyclability(predictions);
            this.updateUI(recyclabilityInfo, predictions);
        } catch (error) {
            this.handleError('Prediction failed', error);
        }
    }

    // Determine recyclability from predictions
    determineRecyclability(predictions) {
        const topPrediction = predictions.reduce((max, current) => 
            current.probability > max.probability ? current : max
        );
        
        return {
            isRecyclable: CONFIG.RECYCLABLE_CLASSES.includes(topPrediction.className),
            className: topPrediction.className,
            confidence: topPrediction.probability
        };
    }

    // Update UI with results
    updateUI(recyclabilityInfo, predictions) {
        this.updateRecyclabilityDisplay(recyclabilityInfo);
        this.updateProgressBars(predictions);
    }

    // Update recyclability display
    updateRecyclabilityDisplay(info) {
        const element = this.elements.recyclability;
        if (!element) return;

        const emoji = info.isRecyclable ? '✅' : '❌';
        const status = info.isRecyclable ? 'Recyclable' : 'Non-Recyclable';
        const colorClass = info.isRecyclable ? 'text-success' : 'text-danger';
        
        element.textContent = `${emoji} ${status} (${info.className})`;
        element.className = `fs-3 fw-bold my-3 ${colorClass}`;
    }

    // Update progress bars
    updateProgressBars(predictions) {
        predictions.forEach(prediction => {
            const elements = this.elements.progress[prediction.className];
            if (elements && elements.bar && elements.text) {
                const percentage = (prediction.probability * 100).toFixed(2);
                elements.bar.value = prediction.probability;
                elements.text.textContent = `${percentage}%`;
            }
        });
    }

    // Helper methods
    updatePreviewContainer(element) {
        const container = this.elements['webcam-container'];
        if (!container) return;

        container.innerHTML = '';
        
        const wrapper = document.createElement('div');
        Object.assign(wrapper.style, {
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
        });
        
        wrapper.appendChild(element);
        container.appendChild(wrapper);
    }

    resetPreviewContainer() {
        const container = this.elements['webcam-container'];
        if (container) {
            container.innerHTML = '<span class="text-muted">Preview will appear here</span>';
        }
    }

    clearResults() {
        if (this.elements.recyclability) {
            this.elements.recyclability.textContent = '';
        }
        
        // Reset progress bars
        Object.values(this.elements.progress).forEach(elements => {
            if (elements.bar && elements.text) {
                elements.bar.value = 0;
                elements.text.textContent = '0%';
            }
        });
    }

    setButtonState(button, text, disabled) {
        if (button) {
            button.textContent = text;
            button.disabled = disabled;
        }
    }

    setLabelText(text) {
        if (this.elements.fileLabel) {
            this.elements.fileLabel.textContent = text;
        }
    }

    // Error handling
    handleError(message, error) {
        console.error(message, error);
        this.showError(`${message}: ${error.message}`);
    }

    handleWebcamError(error) {
        console.error('Webcam error:', error);
        
        if (error.name === 'NotAllowedError') {
            this.showError('Please allow camera access to use this feature');
        } else if (error.name === 'NotFoundError') {
            this.showError('No camera found on this device');
        } else {
            this.showError(`Webcam error: ${error.message}`);
        }
    }

    showError(message) {
        const errorElement = this.elements['error-message'];
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('d-none');
            
            // Auto-hide after timeout
            setTimeout(() => {
                errorElement.classList.add('d-none');
            }, CONFIG.ERROR_TIMEOUT);
        }
    }

    clearError() {
        const errorElement = this.elements['error-message'];
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.add('d-none');
        }
    }

    // Cleanup resources
    cleanup() {
        if (this.isWebcamActive) {
            this.stopWebcam();
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.recyclabilityDetector = new RecyclabilityDetector();
});