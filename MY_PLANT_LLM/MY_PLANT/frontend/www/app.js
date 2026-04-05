// DOM Elements
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const uploadSection = document.getElementById('uploadSection');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const retakeBtn = document.getElementById('retakeBtn');
const resultsSection = document.getElementById('resultsSection');
const loader = document.getElementById('loader');
const resultCard = document.getElementById('resultCard');
const scanAgainBtn = document.getElementById('scanAgainBtn');
const plantTypeSelect = document.getElementById('plantType');

let selectedFile = null;

// Backend API configuration - local server as defined in Python
const API_URL = 'http://localhost:5000/predict';

// Image chosen logic
imageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        
        // Show local preview via FileReader
        const reader = new FileReader();
        reader.onload = (evt) => {
            imagePreview.src = evt.target.result;
            dropZone.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
});

// Restart action
const resetView = () => {
    selectedFile = null;
    imageInput.value = '';
    previewContainer.classList.add('hidden');
    resultsSection.classList.add('hidden');
    resultCard.classList.add('hidden');
    
    uploadSection.classList.remove('hidden');
    dropZone.classList.remove('hidden');
};

retakeBtn.addEventListener('click', resetView);
scanAgainBtn.addEventListener('click', resetView);

// Analyze action
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Transition to loading view
    uploadSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    loader.classList.remove('hidden');
    resultCard.classList.add('hidden');

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('plantType', plantTypeSelect.value);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        
        // Render results and hide loader
        loader.classList.add('hidden');
        resultCard.classList.remove('hidden');

        populateResults(data);

    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Failed to connect to the analysis backend. Please ensure the terminal is open and `python3 backend/app.py` is running.');
        resetView();
    }
});

// Render the JSON payload received from backend 
function populateResults(data) {
    document.getElementById('diseaseLabel').textContent = data.label.replace(/_+/g, ' ');
    document.getElementById('confidenceScore').textContent = data.confidence;
    
    const badge = document.getElementById('statusBadge');
    badge.textContent = data.status;
    badge.className = `status-badge ${data.status.toLowerCase()}`;

    // Populate the detail lists
    populateList('symptomsList', data.details.symptoms);
    populateList('causesList', data.details.causes);
    
    // Merge management and treatment for simpler UX
    const management = (data.details.management || []).concat(data.details.treatment || []);
    populateList('treatmentList', management);
}

// Helper to fill unordered lists
function populateList(elementId, items) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = '';
    
    if (!items || items.length === 0) {
        ul.innerHTML = '<li>Details unavailable.</li>';
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
    });
}
