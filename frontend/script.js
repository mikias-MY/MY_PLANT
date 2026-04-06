document.addEventListener('DOMContentLoaded', () => {
    window.MY_PLANT_TTS_PROXY_URL = '/api/tts'; // Proxied via Nginx
    
    const HISTORY_KEY = 'my_plant_scan_history_v1';
    const MAX_HISTORY = 25;
    const UNCERTAIN_THRESHOLD = 0.12;
    const MIN_TOP1_TOP2_GAP = 0.08;
    const MIN_IMAGE_BRIGHTNESS = 35;
    const MIN_IMAGE_CONTRAST = 18;
    const MIN_IMAGE_SHARPNESS = 12;
    // If the user scans (almost) the same frame again, we should ask for a retake.
    // This improves trust when camera frames don't update as expected.
    const MIN_CAPTURE_SIGNATURE_DIFF = 0.9;

    const t = (key, vars) =>
        (window.MY_PLANT_I18N && window.MY_PLANT_I18N.t(key, vars)) || key;

    /** @typedef {{ id: string, pvPrefix: string | null, supported: boolean }} CropChoice */
    /** Model classes use PlantVillage names; coffee/cabbage are not in the model. */
    const CROP_CHOICES = [
        { id: 'auto', pvPrefix: null, supported: true },
        { id: 'tomato', pvPrefix: 'Tomato', supported: true },
        { id: 'potato', pvPrefix: 'Potato', supported: true },
        { id: 'pepper', pvPrefix: 'Pepper,_bell', supported: true },
        { id: 'corn', pvPrefix: 'Corn_(maize)', supported: true },
        { id: 'apple', pvPrefix: 'Apple', supported: true },
        { id: 'grape', pvPrefix: 'Grape', supported: true },
        { id: 'cherry', pvPrefix: 'Cherry_(including_sour)', supported: true },
        { id: 'peach', pvPrefix: 'Peach', supported: true },
        { id: 'orange', pvPrefix: 'Orange', supported: true },
        { id: 'strawberry', pvPrefix: 'Strawberry', supported: true },
        { id: 'squash', pvPrefix: 'Squash', supported: true },
        { id: 'soybean', pvPrefix: 'Soybean', supported: true },
        { id: 'blueberry', pvPrefix: 'Blueberry', supported: true },
        { id: 'raspberry', pvPrefix: 'Raspberry', supported: true },
        { id: 'coffee', pvPrefix: null, supported: false },
        { id: 'cabbage', pvPrefix: null, supported: false }
    ];

    const CROP_LABEL_KEYS = {
        auto: 'crop_select_auto',
        tomato: 'crop_tomato',
        potato: 'crop_potato',
        pepper: 'crop_bell_pepper',
        corn: 'crop_corn',
        apple: 'crop_apple',
        grape: 'crop_grape',
        cherry: 'crop_cherry',
        peach: 'crop_peach',
        orange: 'crop_orange',
        strawberry: 'crop_strawberry',
        squash: 'crop_squash',
        soybean: 'crop_soybean',
        blueberry: 'crop_blueberry',
        raspberry: 'crop_raspberry',
        coffee: 'crop_coffee',
        cabbage: 'crop_cabbage'
    };

    const selectedCropId = 'auto';

    function getCropChoiceById(id) {
        return CROP_CHOICES.find((c) => c.id === id) || CROP_CHOICES[0];
    }

    function cropLabelForId(id) {
        const key = CROP_LABEL_KEYS[id] || 'crop_plant';
        const tr = t(key);
        return tr !== key ? tr : id;
    }

    function rawClassMatchesCropPrefix(rawName, pvPrefix) {
        if (!pvPrefix || !rawName) return false;
        const sep = rawName.indexOf('___');
        const head = sep >= 0 ? rawName.slice(0, sep) : rawName;
        return head === pvPrefix;
    }

    function filterProbsByCropPrefix(probs, indices, pvPrefix) {
        if (!pvPrefix) return { probs, filtered: false };
        const n = probs.length;
        const mask = new Array(n).fill(false);
        for (let i = 0; i < n; i++) {
            const rawName = indices[String(i)] || indices[i];
            if (rawName && rawClassMatchesCropPrefix(rawName, pvPrefix)) mask[i] = true;
        }
        if (!mask.some(Boolean)) return { probs, filtered: false };
        const out = new Float32Array(n);
        let sum = 0;
        for (let i = 0; i < n; i++) {
            const v = mask[i] ? probs[i] : 0;
            out[i] = v;
            sum += v;
        }
        if (sum < 1e-12) return { probs, filtered: false };
        for (let i = 0; i < n; i++) out[i] /= sum;
        return { probs: out, filtered: true };
    }

    function appendConditionCareDetail(rawClassName, isHealthy) {
        const lower = (rawClassName || '').toLowerCase();
        if (isHealthy) return t('care_detail_healthy');
        if (lower.includes('late_blight')) return t('care_detail_late_blight');
        if (lower.includes('early_blight')) return t('care_detail_early_blight');
        if (lower.includes('powdery_mildew') || lower.includes('powdery mildew')) return t('care_detail_powdery_mildew');
        if (lower.includes('bacterial')) return t('care_detail_bacterial');
        if (lower.includes('mosaic') || lower.includes('virus')) return t('care_detail_viral');
        if (lower.includes('spider') || lower.includes('mite')) return t('care_detail_mite');
        if (lower.includes('leaf_spot') || lower.includes('leaf spot') || lower.includes('septoria')) return t('care_detail_leaf_spot');
        return t('care_detail_disease_general');
    }

    let tfModel = null;
    let classIndices = null;
    let modelLoadPromise = null;
    let plantDocBundle = null;
    let plantDocLocaleJson = null;

    setTimeout(() => {
        goToScreen('screen-2');
    }, 2000);

    const navButtons = document.querySelectorAll('[data-next]');
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const nextScreenId = e.currentTarget.getAttribute('data-next');
            if (nextScreenId) {
                goToScreen(nextScreenId);
            }
        });
    });

    const scanTrigger = document.getElementById('scan-trigger');
    const resultsPreview = document.getElementById('results-preview');
    const scanningText = document.querySelector('.scanning-text');
    const scanningLine = document.querySelector('.scanning-line');

    function setScanningKey(key) {
        if (scanningText) {
            scanningText.textContent = t(key);
            scanningText.dataset.i18nScan = key;
        }
    }
    const errorModal = document.getElementById('error-modal');
    const closeError = document.getElementById('close-error');
    const retakeBtn = document.getElementById('retake-btn');
    const cameraVideo = document.getElementById('camera-feed');
    const captureCanvas = document.getElementById('capture-canvas');
    const galleryTrigger = document.getElementById('gallery-trigger');
    const galleryInput = document.getElementById('gallery-input');
    const galleryPreview = document.getElementById('gallery-preview');
    const errorTitle = document.getElementById('error-title');
    const errorDesc = document.getElementById('error-desc');
    const cameraPermModal = document.getElementById('camera-permission-modal');
    const cameraPermAllow = document.getElementById('camera-perm-allow');
    const cameraPermSkip = document.getElementById('camera-perm-skip');
    const cameraPermError = document.getElementById('camera-perm-error');

    const CAM_SESSION_KEY = 'my_plant_camera_session_ok';

    let cameraStream = null;
    let isFlashOn = false;

    function showCameraPermissionModal(resetError = true) {
        if (!cameraPermModal) return;
        if (resetError && cameraPermError) {
            cameraPermError.textContent = '';
            cameraPermError.classList.add('hidden');
        }
        cameraPermModal.classList.remove('hidden');
    }

    function hideCameraPermissionModal() {
        if (cameraPermModal) cameraPermModal.classList.add('hidden');
    }

    function translateCameraUserMessage(err) {
        if (!err) return t('cam_err_generic');
        if (err.name === 'NotAllowedError') return t('cam_err_denied');
        if (err.name === 'NotFoundError') return t('cam_err_notfound');
        if (err.name === 'OverconstrainedError') return t('cam_err_overconstrained');
        const msg = String(err.message || '');
        if (msg.includes('secure') || msg.includes('HTTPS') || msg.includes('localhost')) return t('err_secure_context');
        return msg || t('cam_err_generic');
    }

    async function getCameraVideoStream() {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
            const isSecure = typeof window.isSecureContext !== 'undefined' ? window.isSecureContext : window.location.protocol === 'https:';
            if (!isSecure && window.location.hostname !== '100.115.92.205' && window.location.hostname !== '100.115.92.205') {
                throw new Error(t('err_secure_context'));
            }
            throw new Error(t('err_no_camera_api'));
        }
        const attempts = [
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            { video: { facingMode: 'user' }, audio: false },
            { video: true, audio: false }
        ];
        let lastErr;
        for (const constraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error(t('cam_err_generic'));
    }

    async function attachCameraStream() {
        try {
            cameraStream = await getCameraVideoStream();
            if (cameraVideo) {
                cameraVideo.srcObject = cameraStream;
            }
            isFlashOn = false;
            const flashBtn = document.getElementById('flash-trigger');
            if (flashBtn) flashBtn.classList.remove('flash-active');
            sessionStorage.setItem(CAM_SESSION_KEY, '1');
            hideCameraPermissionModal();
            if (cameraPermError) {
                cameraPermError.textContent = '';
                cameraPermError.classList.add('hidden');
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            sessionStorage.removeItem(CAM_SESSION_KEY);
            let msg = translateCameraUserMessage(err);
            const modalWasHidden = cameraPermModal && cameraPermModal.classList.contains('hidden');
            if (modalWasHidden) {
                showCameraPermissionModal(false);
            }
            if (cameraPermError) {
                cameraPermError.textContent = msg;
                cameraPermError.classList.remove('hidden');
            }
        }
    }

    async function loadClassIndices() {
        if (classIndices) return classIndices;
        const res = await fetch('class_indices.json');
        if (!res.ok && res.status !== 0) throw new Error(t('err_analysis_body'));
        classIndices = await res.json();
        return classIndices;
    }

    async function loadPlantDocLocale() {
        if (plantDocLocaleJson) return plantDocLocaleJson;
        try {
            const res = await fetch('dataset/plantdoc/plantdoc_locale.json');
            if (!res.ok && res.status !== 0) return (plantDocLocaleJson = {});
            plantDocLocaleJson = await res.json();
        } catch {
            plantDocLocaleJson = {};
        }
        return plantDocLocaleJson;
    }

    async function loadPlantDocBundle() {
        if (plantDocBundle) return plantDocBundle;
        const [clsRes, mapRes, manRes] = await Promise.all([
            fetch('dataset/plantdoc/plantdoc_classes.json'),
            fetch('dataset/plantdoc/plantdoc_village_map.json'),
            fetch('dataset/plantdoc/dataset_manifest.json')
        ]);
        if ((!clsRes.ok && clsRes.status !== 0) || (!mapRes.ok && mapRes.status !== 0) || (!manRes.ok && manRes.status !== 0)) {
            throw new Error('Could not load PlantDoc dataset files');
        }
        const clsJson = await clsRes.json();
        const pvMap = await mapRes.json();
        delete pvMap._comment;
        const manifest = await manRes.json();
        const classesById = {};
        clsJson.classes.forEach((c) => {
            classesById[c.id] = c;
        });
        plantDocBundle = {
            classesList: clsJson.classes,
            classesById,
            pvMap,
            manifest
        };
        return plantDocBundle;
    }

    function resolvePlantDocEntry(pvLabel, bundle) {
        if (!bundle || !pvLabel) return null;
        let id = bundle.pvMap[pvLabel];
        if (id === undefined) id = bundle.pvMap[pvLabel.trim()];
        if (id === undefined) {
            const alt = pvLabel.replace(/\s+/g, ' ').trim();
            id = bundle.pvMap[alt];
        }
        if (id === null || id === undefined || id === '') return null;
        return bundle.classesById[id] || null;
    }

    function getPlantDocLocaleBlock(entryId, lang) {
        if (!entryId || !plantDocLocaleJson) return null;
        const block = plantDocLocaleJson[lang];
        if (!block || !block[entryId]) return null;
        return block[entryId];
    }

    function localizedCropName(crop) {
        if (!crop) return crop;
        const c = crop.toLowerCase();
        if (c.includes('pepper') && (c.includes('bell') || c.includes('pepper,_'))) return t('crop_bell_pepper');
        const head = crop.split('(')[0].split(',')[0].trim();
        const word = head.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
        if (!word) return crop;
        const k = `crop_${word}`;
        const tr = t(k);
        return tr !== k ? tr : crop;
    }

    function localizedKind(kind) {
        if (!kind) return '';
        const map = {
            fungal: 'kind_fungal',
            healthy_reference: 'kind_healthy_reference',
            fungal_bacterial: 'kind_fungal_bacterial',
            oomycete: 'kind_oomycete',
            bacterial: 'kind_bacterial',
            viral: 'kind_viral',
            pest: 'kind_pest'
        };
        const key = map[kind] || `kind_${kind}`;
        const tr = t(key);
        return tr !== key ? tr : String(kind).replace(/_/g, ' ');
    }

    function formatPvShort(raw) {
        const { crop, condition } = parsePlantVillageClass(raw);
        return `${crop} · ${condition}`;
    }

    async function ensureModelLoaded() {
        if (tfModel) return tfModel;
        if (modelLoadPromise) return modelLoadPromise;
        modelLoadPromise = (async () => {
            await loadClassIndices();
            if (typeof tf === 'undefined') {
                throw new Error('TensorFlow.js failed to load');
            }
            tfModel = await tf.loadLayersModel('tensorflowjs-model/model.json');
            return tfModel;
        })();
        return modelLoadPromise;
    }

    function parsePlantVillageClass(raw) {
        const isHealthy = /___healthy/i.test(raw) || /_healthy/i.test(raw);
        const parts = raw.split('___');
        const crop = (parts[0] || 'Plant').replace(/_/g, ' ').trim();
        const condition = parts.length > 1
            ? parts.slice(1).join(' ').replace(/_/g, ' ').trim()
            : raw.replace(/_/g, ' ');
        return { crop, condition, isHealthy };
    }

    function mapPredictionToAppShape(rawClassName, topProb, options = {}) {
        const { plantDocEntry, topK, cropContext } = options;
        const lang = window.MY_PLANT_I18N ? window.MY_PLANT_I18N.getLang() : 'en';
        const { crop, condition, isHealthy } = parsePlantVillageClass(rawClassName);
        const cropDisp = localizedCropName(crop);
        const confidence = Math.round(topProb * 10000) / 100;
        const status = isHealthy ? 'Healthy' : condition;
        const slug = rawClassName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

        const cnnSymptoms = isHealthy
            ? t('cnn_healthy', { crop: cropDisp, confidence })
            : t('cnn_disease', { condition, crop: cropDisp, confidence });
        const cnnSolution = isHealthy
            ? t('solution_healthy')
            : t('solution_disease', { condition, crop: cropDisp });

        let symptoms;
        let solution;
        let displayName = cropDisp;
        let displaySpecies = isHealthy ? t('status_healthy') : condition;

        const loc = plantDocEntry ? getPlantDocLocaleBlock(plantDocEntry.id, lang) : null;
        const kindDisp = plantDocEntry ? localizedKind(plantDocEntry.kind) : '';

        if (plantDocEntry) {
            if (lang === 'en') {
                symptoms = `${t('section_reference_symptoms')}\n${plantDocEntry.symptoms}\n\n${t('section_model_note')}\n${cnnSymptoms}\n\n${t('symptoms_how_to_confirm')}`;
                solution = `${t('section_reference_management')}\n${plantDocEntry.management}\n\n${t('scan_confidence_note', { p: confidence })}\n\n${t('treatment_escalation_note')}`;
                displaySpecies = plantDocEntry.label;
            } else if (loc) {
                symptoms = `${t('section_reference_symptoms')}\n${loc.symptoms}\n\n${t('section_model_note')}\n${t('scan_diagnosis_footer', { p: confidence })}\n\n${t('symptoms_how_to_confirm')}`;
                solution = `${t('section_reference_management')}\n${loc.management}\n\n${t('scan_treatment_footer')}\n\n${t('treatment_escalation_note')}`;
                displaySpecies = loc.label;
            } else {
                symptoms = `${t('section_reference_symptoms')}\n${plantDocEntry.symptoms}\n\n${t('plantdoc_detail_fallback')}\n\n${t('section_model_note')}\n${cnnSymptoms}\n\n${t('symptoms_how_to_confirm')}`;
                solution = `${t('section_reference_management')}\n${plantDocEntry.management}\n\n${cnnSolution}\n\n${t('treatment_escalation_note')}`;
                displaySpecies = plantDocEntry.label;
            }
        } else {
            symptoms = `${t('result_accuracy_notice')}\n\n${cnnSymptoms}\n\n${t('symptoms_how_to_confirm')}`;
            solution = `${cnnSolution}\n\n${t('treatment_escalation_note')}`;
        }

        const practicalBlock = `\n\n${t('additional_care_heading')}\n${appendConditionCareDetail(rawClassName, isHealthy)}`;
        solution = `${solution}${practicalBlock}`;

        const plantdocRefText = plantDocEntry
            ? t('plantdoc_ref_line', {
                label: lang === 'en' ? plantDocEntry.label : (loc ? loc.label : plantDocEntry.label),
                crop: cropDisp,
                kind: kindDisp
            })
            : '';

        let cropContextLine = '';
        if (cropContext) {
            if (cropContext.unsupported) {
                cropContextLine = t('crop_unsupported_note');
            } else if (cropContext.filtered && cropContext.cropLabel) {
                cropContextLine = t('crop_filter_note', { crop: cropContext.cropLabel });
            }
        }

        return {
            name: displayName,
            species: displaySpecies,
            status,
            label: slug,
            confidence,
            symptoms,
            solution,
            rawClass: rawClassName,
            source: 'tensorflowjs',
            plantdocRefText,
            topK: topK || null,
            plantDocId: plantDocEntry ? plantDocEntry.id : null,
            cropContextLine,
            selectedCropId: cropContext ? cropContext.selectedCropId : null
        };
    }

    function computeTopKFromProbs(probs, indices, k) {
        const rows = [];
        const n = probs.length;
        for (let i = 0; i < n; i++) {
            const rawName = indices[String(i)] || indices[i];
            if (!rawName) continue;
            rows.push({ classIndex: i, rawName, probability: probs[i] });
        }
        rows.sort((a, b) => b.probability - a.probability);
        return rows.slice(0, k);
    }

    let lastCaptureSignature = null;

    function assessCaptureQuality() {
        try {
            if (!captureCanvas || captureCanvas.width < 2 || captureCanvas.height < 2) {
                return { ok: false, reason: t('err_no_image') };
            }

        const probe = document.createElement('canvas');
        const side = 96;
        probe.width = side;
        probe.height = side;
        const pctx = probe.getContext('2d', { willReadFrequently: true });
        pctx.drawImage(captureCanvas, 0, 0, side, side);
        const data = pctx.getImageData(0, 0, side, side).data;

        let brightnessSum = 0;
        let sqSum = 0;
        const gray = new Float32Array(side * side);
        for (let i = 0, px = 0; i < data.length; i += 4, px++) {
            const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            gray[px] = g;
            brightnessSum += g;
            sqSum += g * g;
        }
        const count = gray.length;
        const mean = brightnessSum / count;
        const variance = Math.max(0, sqSum / count - mean * mean);
        const contrast = Math.sqrt(variance);

        let edgeSum = 0;
        let edgeCount = 0;
        for (let y = 1; y < side - 1; y++) {
            for (let x = 1; x < side - 1; x++) {
                const i = y * side + x;
                const gx = Math.abs(gray[i + 1] - gray[i - 1]);
                const gy = Math.abs(gray[i + side] - gray[i - side]);
                edgeSum += gx + gy;
                edgeCount++;
            }
        }
        const sharpness = edgeCount ? edgeSum / edgeCount : 0;

        // Create a coarse "signature" of the image so we can detect near-identical re-scans.
        const sigSize = 8; // 8x8 = 64 features
        const block = Math.floor(side / sigSize); // 96/8 = 12
        const signature = new Float32Array(sigSize * sigSize);
        let si = 0;
        for (let sy = 0; sy < sigSize; sy++) {
            for (let sx = 0; sx < sigSize; sx++) {
                const xStart = sx * block;
                const yStart = sy * block;
                let sum = 0;
                let c = 0;
                for (let yy = yStart; yy < Math.min(side, yStart + block); yy++) {
                    for (let xx = xStart; xx < Math.min(side, xStart + block); xx++) {
                        sum += gray[yy * side + xx];
                        c++;
                    }
                }
                signature[si++] = c ? (sum / c) : 0;
            }
        }

            if (lastCaptureSignature) {
                let dist = 0;
                for (let i = 0; i < signature.length; i++) dist += Math.abs(signature[i] - lastCaptureSignature[i]);
                dist /= signature.length;
                if (dist < MIN_CAPTURE_SIGNATURE_DIFF) {
                    return { ok: false, reason: 'It looks like you scanned the same frame. Retake (move closer / refocus / fill the frame with one leaf).' };
                }
            }

        if (mean < MIN_IMAGE_BRIGHTNESS) {
            return { ok: false, reason: 'Image is too dark. Turn on flash or move to better light.' };
        }
        if (contrast < MIN_IMAGE_CONTRAST) {
            return { ok: false, reason: 'Image has low contrast. Move closer and keep only the leaf in frame.' };
        }
        if (sharpness < MIN_IMAGE_SHARPNESS) {
            return { ok: false, reason: 'Image is blurry. Hold still and refocus before scanning.' };
        }

            lastCaptureSignature = signature;
            return { ok: true };
        } catch (e) {
            // Never block scan due to quality-check internals on older devices.
            return { ok: true };
        }
    }

    async function predictWithTensorFlow(cropFilterOptions = {}) {
        const model = await ensureModelLoaded();
        if (!captureCanvas || captureCanvas.width < 2 || captureCanvas.height < 2) {
            throw new Error(t('err_no_image'));
        }

        // Light-weight robustness (center + slight zoom) to avoid mobile crashes.
        const probsTensor = tf.tidy(() => {
            const img0 = tf.browser.fromPixels(captureCanvas).toFloat();
            const w = captureCanvas.width;
            const h = captureCanvas.height;
            const side = Math.min(w, h);
            const y0Base = Math.max(0, Math.floor((h - side) / 2));
            const x0Base = Math.max(0, Math.floor((w - side) / 2));
            const asTensor = (out) => Array.isArray(out) ? out[0] : out;
            const run = (x0, y0, cSide) => {
                let crop = img0.slice([y0, x0, 0], [cSide, cSide, 3]);
                crop = tf.image.resizeBilinear(crop, [224, 224]);
                return asTensor(model.predict(crop.div(255).expandDims(0)));
            };

            // 1) center crop
            const p1 = run(x0Base, y0Base, side);

            // 2) slight zoom-in center crop
            const zoomSide = Math.max(32, Math.floor(side * 0.9));
            const zx = Math.max(0, Math.floor((w - zoomSide) / 2));
            const zy = Math.max(0, Math.floor((h - zoomSide) / 2));
            const p2 = run(zx, zy, zoomSide);

            return tf.add(p1, p2).div(tf.scalar(2));
        });

        const rawProbs = await probsTensor.data();
        probsTensor.dispose();

        const indices = await loadClassIndices();
        // Always run full-model inference across all classes to avoid crop bias.
        const probs = rawProbs;

        let bestIdx = 0;
        let bestP = probs[0];
        for (let i = 1; i < probs.length; i++) {
            if (probs[i] > bestP) {
                bestP = probs[i];
                bestIdx = i;
            }
        }

        const rawName = indices[String(bestIdx)] || indices[bestIdx];
        if (!rawName) {
            throw new Error(t('err_unknown_class'));
        }

        const topK = computeTopKFromProbs(probs, indices, 5);

        return { rawName, probability: bestP, classIndex: bestIdx, topK, cropFilterApplied: false };
    }

    function makeHistoryThumb() {
        if (!captureCanvas || captureCanvas.width < 2) return null;
        try {
            const t = document.createElement('canvas');
            const maxSide = 128;
            let w = captureCanvas.width;
            let h = captureCanvas.height;
            const scale = Math.min(1, maxSide / Math.max(w, h));
            t.width = Math.round(w * scale);
            t.height = Math.round(h * scale);
            t.getContext('2d').drawImage(captureCanvas, 0, 0, t.width, t.height);
            return t.toDataURL('image/jpeg', 0.72);
        } catch {
            return null;
        }
    }

    function readHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function writeHistory(items) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
    }

    function saveScanToHistory(data) {
        const thumb = makeHistoryThumb();
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date().toISOString(),
            name: data.name,
            species: data.species,
            status: data.status,
            label: data.label,
            confidence: data.confidence,
            symptoms: data.symptoms,
            solution: data.solution,
            thumb: thumb || undefined,
            rawClass: data.rawClass,
            topK: data.topK || undefined,
            plantdocRefText: data.plantdocRefText || undefined,
            plantDocId: data.plantDocId || undefined,
            cropContextLine: data.cropContextLine || undefined,
            selectedCropId: data.selectedCropId || undefined
        };
        const next = [entry, ...readHistory().filter(e => e.id !== entry.id)];
        writeHistory(next);
    }

    async function startCamera() {
        if (sessionStorage.getItem(CAM_SESSION_KEY) === '1') {
            await attachCameraStream();
            return;
        }
        showCameraPermissionModal();
    }

    if (cameraPermAllow) {
        cameraPermAllow.addEventListener('click', () => {
            attachCameraStream();
        });
    }

    if (cameraPermSkip) {
        cameraPermSkip.addEventListener('click', () => {
            hideCameraPermissionModal();
        });
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        if (cameraVideo) {
            cameraVideo.srcObject = null;
        }
        isFlashOn = false;
        const flashBtn = document.getElementById('flash-trigger');
        if (flashBtn) flashBtn.classList.remove('flash-active');
    }

    async function toggleFlash() {
        if (!cameraStream) return;

        let track = cameraStream.getVideoTracks()[0];
        let capabilities = track.getCapabilities();

        if (!capabilities.torch) {
            try {
                const rear = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { exact: 'environment' } },
                    audio: false
                });
                stopCamera();
                cameraStream = rear;
                if (cameraVideo) cameraVideo.srcObject = cameraStream;
                track = cameraStream.getVideoTracks()[0];
                capabilities = track.getCapabilities();
            } catch (e) {}
            if (!capabilities.torch) {
                if (errorModal) {
                    if (errorTitle) errorTitle.textContent = 'Flash not available';
                    if (errorDesc) errorDesc.textContent = 'This camera does not support torch. Try the rear camera or use brighter light.';
                    errorModal.classList.remove('hidden');
                }
                return;
            }
        }

        try {
            isFlashOn = !isFlashOn;
            await track.applyConstraints({
                advanced: [{ torch: isFlashOn }]
            });

            const flashBtn = document.getElementById('flash-trigger');
            if (flashBtn) {
                if (isFlashOn) flashBtn.classList.add('flash-active');
                else flashBtn.classList.remove('flash-active');
            }
        } catch (err) {
            console.error('Error toggling flash:', err);
        }
    }

    const flashTrigger = document.getElementById('flash-trigger');
    if (flashTrigger) {
        flashTrigger.addEventListener('click', toggleFlash);
    }

    function captureFrame() {
        if (cameraVideo && captureCanvas) {
            const context = captureCanvas.getContext('2d');

            const MAX_SIZE = 1024;
            let width = cameraVideo.videoWidth;
            let height = cameraVideo.videoHeight;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            captureCanvas.width = width;
            captureCanvas.height = height;
            context.drawImage(cameraVideo, 0, 0, width, height);
        }
    }

    function resetScan() {
        if (resultsPreview) resultsPreview.classList.add('hidden');
        if (galleryPreview) galleryPreview.classList.add('hidden');
        if (cameraVideo) cameraVideo.classList.remove('hidden');
        setScanningKey('scanning');
        if (scanningLine) scanningLine.style.display = 'block';
    }

    if (scanTrigger) {
        scanTrigger.addEventListener('click', async () => {
            captureFrame();

            setScanningKey('analyzing');
            if (scanningLine) scanningLine.style.display = 'block';

            try {
                const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg'));
                await performPrediction(blob);
            } catch (error) {
                console.error('Scan error:', error);
                if (errorModal) errorModal.classList.remove('hidden');
                setScanningKey('scan_failed');
                if (scanningLine) scanningLine.style.display = 'none';
            }
        });
    }

    if (galleryTrigger) {
        galleryTrigger.addEventListener('click', () => {
            galleryInput.click();
        });
    }

    if (galleryInput) {
        galleryInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (typeof window.stopCamera === 'function') window.stopCamera();

            setScanningKey('processing');
            if (scanningLine) scanningLine.style.display = 'block';

            try {
                const img = new Image();
                const reader = new FileReader();

                reader.onload = (event) => {
                    img.onload = async () => {
                        if (galleryPreview) {
                            galleryPreview.src = event.target.result;
                            galleryPreview.classList.remove('hidden');
                        }
                        if (cameraVideo) cameraVideo.classList.add('hidden');

                        const context = captureCanvas.getContext('2d');

                        const MAX_SIZE = 1024;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }

                        captureCanvas.width = width;
                        captureCanvas.height = height;
                        context.drawImage(img, 0, 0, width, height);

                        await performPrediction(file);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Gallery upload error:', error);
                if (errorModal) {
                    if (errorTitle) errorTitle.textContent = t('err_upload_failed');
                    if (errorDesc) errorDesc.textContent = t('err_upload_body');
                    errorModal.classList.remove('hidden');
                }
                setScanningKey('processing_failed');
                if (scanningLine) scanningLine.style.display = 'none';
            }
        });
    }

    async function performPrediction(blobOrFile) {
        try {
            const quality = assessCaptureQuality();
            if (!quality.ok) {
                throw new Error(quality.reason);
            }

            setScanningKey('analyzing');

            // Collect Plant Type context
            const plantTypeSelect = document.getElementById('plantType');
            const ptValue = plantTypeSelect ? plantTypeSelect.value : "Unknown";

            // Submit strictly to MY_PLANT native Python TF OFFLINE backend
            const formData = new FormData();
            formData.append('image', blobOrFile, 'image.jpg');
            formData.append('plantType', ptValue);
            if (window.MY_PLANT_I18N) {
                formData.append('language', window.MY_PLANT_I18N.getLang());
            }

            let pb = null;
            try {
                const res = await fetch('http://192.168.100.40:5000/predict', {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) {
                    throw new Error("Backend not available");
                }
                pb = await res.json();
            } catch (err) {
                console.log("Backend offline, falling back to local TensorFlow.js inference...");
                const tfResult = await predictWithTensorFlow();
                pb = {
                    status: 'SUCCESS',
                    label: tfResult.rawName,
                    confidence: tfResult.probability
                };
            }
            
            // Handle explicit REJECTED status from backend validation
            if (pb.status === 'REJECTED') {
                throw new Error(pb.error || t('err_no_plant'));
            }
            
            let parsedConfidence = 0.95;
            if (typeof pb.confidence === 'string' && pb.confidence.includes('%')) {
                parsedConfidence = parseFloat(pb.confidence.replace('%', '')) / 100;
            } else if (typeof pb.confidence === 'number') {
                parsedConfidence = pb.confidence;
            }

            // 100% Offline Multi-Language UI Resolution
            const bundle = plantDocBundle || await loadPlantDocBundle().catch(() => null);
            await loadPlantDocLocale().catch(() => null);
            const plantDocEntry = bundle ? resolvePlantDocEntry(pb.label, bundle) : null;

            // Map it natively using the original translation dictionary tool
            const data = mapPredictionToAppShape(pb.label, parsedConfidence, {
                plantDocEntry,
                topK: [],
                cropContext: {
                    selectedCropId: "offline",
                    cropLabel: ptValue !== "Unknown" ? ptValue : "Auto",
                    filtered: false,
                    unsupported: false
                }
            });
            data.source = 'my_plant_offline_cnn';
            
            if (ptValue !== "Unknown") {
                data.name = localizedCropName(ptValue);
            }

            updateResultsUI(data);
            saveScanToHistory(data);

            if (resultsPreview) resultsPreview.classList.remove('hidden');
            setScanningKey('analysis_complete');
            if (scanningLine) scanningLine.style.display = 'none';
        } catch (error) {
            console.error('Prediction error:', error);

            if (errorModal) {
                if (errorTitle) {
                    errorTitle.textContent = t('err_analysis_failed');
                    errorTitle.style.color = '';
                }
                if (errorDesc) {
                    errorDesc.textContent = error.message || t('err_analysis_body');
                }
                errorModal.classList.remove('hidden');
            }

            setScanningKey('scan_failed');
            if (scanningLine) scanningLine.style.display = 'none';
        }
    }

    function updateResultsUI(data) {
        if (typeof window.cancelResultSpeech === 'function') window.cancelResultSpeech();

        if (data.status === 'NON_BOTANICAL' || data.status === 'REJECTED' || data.label === 'non_plant' || data.error) {
            if (errorModal) {
                if (errorTitle) {
                    errorTitle.textContent = t('err_invalid_image');
                    errorTitle.style.color = '#FF4B4B';
                }
                if (errorDesc) {
                    errorDesc.textContent = data.reasoning || data.error || t('err_upload_body');
                }
                errorModal.classList.remove('hidden');
            }
            if (resultsPreview) resultsPreview.classList.add('hidden');
            return;
        }

        const miniCardTitle = document.querySelector('#results-preview h3');
        const miniCardText = document.querySelector('#results-preview p');
        const miniCardImg = document.querySelector('#results-preview .result-img-small');

        if (miniCardTitle) miniCardTitle.textContent = data.name || 'Plant';
        if (miniCardText) {
            const status = data.status || '—';
            const statusLabel = status === 'Healthy' ? t('status_healthy') : status;
            miniCardText.textContent = `${data.species || statusLabel} • ${data.confidence != null ? data.confidence + '%' : ''}`;
            miniCardText.style.color = (status === 'Healthy') ? '#4CAF50' : '#E91E63';
        }

        if (miniCardImg) {
            if (data.thumb) {
                miniCardImg.src = data.thumb;
            } else if (captureCanvas && captureCanvas.width > 2) {
                miniCardImg.src = captureCanvas.toDataURL('image/jpeg');
            }
        }

        if (resultsPreview) resultsPreview.classList.remove('hidden');

        const detailsTitle = document.querySelector('.disease-title');
        const detailsImg = document.querySelector('.details-image img');
        const sections = document.querySelectorAll('.info-section p');

        if (detailsTitle) {
            const title = data.name || 'Plant';
            const sub = data.species ? ` — ${data.species}` : '';
            detailsTitle.textContent = `${title}${sub}`;
            detailsTitle.style.color = (data.status === 'Healthy') ? '#4CAF50' : '#E91E63';
        }

        if (detailsImg) {
            if (data.thumb) {
                detailsImg.src = data.thumb;
            } else if (captureCanvas && captureCanvas.width > 2) {
                detailsImg.src = captureCanvas.toDataURL('image/jpeg');
            }
        }

        const cropContextLine = document.getElementById('crop-context-line');
        if (cropContextLine) {
            if (data.cropContextLine) {
                cropContextLine.textContent = data.cropContextLine;
                cropContextLine.classList.remove('hidden');
            } else {
                cropContextLine.textContent = '';
                cropContextLine.classList.add('hidden');
            }
        }

        const plantdocRefLine = document.getElementById('plantdoc-ref-line');
        if (plantdocRefLine) {
            if (data.plantdocRefText) {
                plantdocRefLine.textContent = data.plantdocRefText;
                plantdocRefLine.classList.remove('hidden');
            } else {
                plantdocRefLine.textContent = '';
                plantdocRefLine.classList.add('hidden');
            }
        }

        const topkSection = document.getElementById('topk-section');
        const topkBars = document.getElementById('topk-bars');
        if (topkSection && topkBars) {
            if (data.topK && data.topK.length) {
                topkSection.classList.remove('hidden');
                topkBars.innerHTML = '';
                const maxP = data.topK[0].probability || 1e-9;
                data.topK.forEach((row) => {
                    const pct = Math.min(100, Math.round(row.probability * 1000) / 10);
                    const w = maxP > 0 ? Math.min(100, (row.probability / maxP) * 100) : 0;
                    const rowEl = document.createElement('div');
                    rowEl.className = 'topk-row';
                    rowEl.innerHTML = `
                        <div class="topk-label"><span>${formatPvShort(row.rawName)}</span><span>${pct}%</span></div>
                        <div class="topk-track"><div class="topk-fill" style="width:${w}%"></div></div>`;
                    topkBars.appendChild(rowEl);
                });
            } else {
                topkSection.classList.add('hidden');
                topkBars.innerHTML = '';
            }
        }

        const detailPs = document.querySelectorAll('#screen-7 .info-body-scroll p');
        if (detailPs.length >= 2) {
            detailPs[0].innerText = data.symptoms || data.reasoning || '';
            detailPs[0].style.fontSize = '0.95rem';
            detailPs[0].style.lineHeight = '1.55';

            detailPs[1].innerText = data.solution || '';
            detailPs[1].style.fontSize = '0.95rem';
            detailPs[1].style.lineHeight = '1.55';
        }
    }

    if (closeError) {
        closeError.addEventListener('click', () => {
            errorModal.classList.add('hidden');
            if (errorTitle) errorTitle.style.color = '';
            resetScan();
        });
    }

    if (retakeBtn) {
        retakeBtn.addEventListener('click', () => {
            errorModal.classList.add('hidden');
            if (errorTitle) errorTitle.style.color = '';
            resetScan();
        });
    }

    function fetchHistory() {
        const history = readHistory();
        renderHistory(history);
    }

    function renderHistory(history) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        if (history.length === 0) {
            historyList.innerHTML = `<div class="history-empty">${t('history_empty')}</div>`;
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const date = new Date(item.timestamp).toLocaleDateString();
            const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const imgSrc = item.thumb || 'assets/plant_2.png';

            const statusLine =
                item.status === 'Healthy' ? t('status_healthy') : item.status || '—';
            historyItem.innerHTML = `
                <img src="${imgSrc}" class="history-img" alt="Scan">
                <div class="history-info">
                    <h4>${item.name || t('crop_plant')}</h4>
                    <p>${statusLine} • ${date} ${time}</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#97AB7E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            `;

            historyItem.addEventListener('click', () => {
                updateResultsUI(item);
                goToScreen('screen-7');
            });

            historyList.appendChild(historyItem);
        });
    }

    const clearHistoryBtn = document.getElementById('clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm(t('confirm_clear_history'))) {
                localStorage.removeItem(HISTORY_KEY);
                fetchHistory();
            }
        });
    }

    function setupPlantDocLibraryUI() {
        const list = document.getElementById('plantdoc-list');
        const search = document.getElementById('plantdoc-search');
        const stats = document.getElementById('plantdoc-stats-line');
        if (!list) return;

        async function renderPlantDocLibrary() {
            try {
                const bundle = await loadPlantDocBundle();
                await loadPlantDocLocale().catch(() => null);
                const lang = window.MY_PLANT_I18N ? window.MY_PLANT_I18N.getLang() : 'en';
                const m = bundle.manifest.totals;
                if (stats) {
                    stats.textContent = t('library_stats_fmt', {
                        images: m.images_dataset_ninja,
                        objects: m.annotated_objects,
                        classes: m.leaf_classes,
                        license: bundle.manifest.license
                    });
                }
                list.innerHTML = '';
                bundle.classesList.forEach((c) => {
                    const loc = lang !== 'en' ? getPlantDocLocaleBlock(c.id, lang) : null;
                    const title = loc ? loc.label : c.label;
                    const sym = loc ? loc.symptoms : c.symptoms;
                    const man = loc ? loc.management : c.management;
                    const cropD = localizedCropName(c.crop);
                    const kindD = localizedKind(c.kind);
                    const card = document.createElement('div');
                    card.className = 'plantdoc-card';
                    card.dataset.search =
                        `${title} ${cropD} ${kindD} ${c.id} ${sym} ${man} ${c.label} ${c.crop}`.toLowerCase();
                    card.innerHTML = `
                        <div class="plantdoc-card-head">
                            <h4 class="plantdoc-card-title"></h4>
                            <span class="plantdoc-card-crop"></span>
                        </div>
                        <p class="plantdoc-card-kind"></p>
                        <div class="plantdoc-card-body">
                            <p><strong>${t('library_symptoms')}</strong> <span class="pd-sym"></span></p>
                            <p><strong>${t('library_management')}</strong> <span class="pd-man"></span></p>
                        </div>`;
                    card.querySelector('.plantdoc-card-title').textContent = title;
                    card.querySelector('.plantdoc-card-crop').textContent = cropD;
                    card.querySelector('.plantdoc-card-kind').textContent =
                        `${kindD}${c.images_approx != null ? ` · ~${c.images_approx}` : ''}`;
                    card.querySelector('.pd-sym').textContent = sym;
                    card.querySelector('.pd-man').textContent = man;
                    card.addEventListener('click', () => {
                        card.classList.toggle('expanded');
                    });
                    list.appendChild(card);
                });
            } catch (e) {
                list.innerHTML = `<p class="library-lead">${t('library_load_error')} (${e.message || e})</p>`;
            }
        }

        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.trim().toLowerCase();
                list.querySelectorAll('.plantdoc-card').forEach((card) => {
                    const hay = card.dataset.search || '';
                    card.style.display = !q || hay.includes(q) ? '' : 'none';
                });
            });
        }

        window.renderPlantDocLibrary = renderPlantDocLibrary;
    }

    setupPlantDocLibraryUI();

    const LANG_TTS = { en: 'en-US', am: 'am-ET', om: 'om-ET', ar: 'ar-SA' };

    function normalizeSpeechText(s) {
        if (!s) return '';
        return String(s)
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '. ')
            .replace(/።/g, '. ') // Strong break for Amharic
            .replace(/([.!?])\s*/g, '$1  ') // Extra space for better sentence pacing
            .trim();
    }

    function getSpeechVoices() {
        try {
            return window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : [];
        } catch {
            return [];
        }
    }

    function pickVoiceForLang(code) {
        const voices = getSpeechVoices();
        if (!voices.length) return null;
        const tryLangs = {
            en: ['en-US', 'en-GB', 'en-AU', 'en'],
            am: ['am-ET', 'am'],
            om: ['om-ET', 'om', 'om-KE'],
            ar: ['ar-SA', 'ar-EG', 'ar']
        };
        const candidates = tryLangs[code] || tryLangs.en;
        const pool = [];
        
        // Exact language matches first
        for (const pref of candidates) {
            voices.forEach((v) => {
                if (v.lang && v.lang.toLowerCase() === pref.toLowerCase()) pool.push(v);
            });
        }
        
        // Prefix matches (e.g. en-US matches en)
        if (pool.length === 0) {
            for (const pref of candidates) {
                voices.forEach((v) => {
                    if (v.lang && v.lang.toLowerCase().startsWith(pref.toLowerCase())) pool.push(v);
                });
            }
        }

        const uniq = [];
        const seen = new Set();
        pool.forEach((v) => {
            const k = `${v.name}|${v.lang}`;
            if (!seen.has(k)) {
                seen.add(k);
                uniq.push(v);
            }
        });

        const list = uniq.length ? uniq : voices.slice();
        list.sort((a, b) => {
            // Favor high-quality neural/natural providers
            const na = (a.name || '').toLowerCase();
            const nb = (b.name || '').toLowerCase();
            const pa = /premium|enhanced|natural|neural|google|microsoft/i.test(na) ? 2 : 0;
            const pb = /premium|enhanced|natural|neural|google|microsoft/i.test(nb) ? 2 : 0;
            
            if (pb !== pa) return pb - pa;
            
            // Favor local service to reduce latency/network dependency
            const la = a.localService === true ? 1 : 0;
            const lb = b.localService === true ? 1 : 0;
            if (lb !== la) return lb - la;

            return na.localeCompare(nb);
        });
        return list[0];
    }

    function speechChunks(text, maxLen) {
        const t = normalizeSpeechText(text);
        if (!t) return [];
        if (t.length <= maxLen) return [t];
        const parts = [];
        let buf = '';
        const bits = t.split(/(\.\s+)/);
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            if ((buf + bit).length > maxLen && buf.trim()) {
                parts.push(buf.trim());
                buf = bit;
            } else buf += bit;
        }
        if (buf.trim()) parts.push(buf.trim());
        return parts.length ? parts : [t];
    }

    function buildResultSpeechText() {
        const titleEl = document.querySelector('#screen-7 .disease-title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        const ref = document.getElementById('plantdoc-ref-line');
        const refText = ref && !ref.classList.contains('hidden') ? ref.textContent.trim() : '';
        const ps = document.querySelectorAll('#screen-7 .info-body-scroll p');
        let desc = '';
        let treat = '';
        if (ps.length >= 1) desc = (ps[0].innerText || '').trim();
        if (ps.length >= 2) treat = (ps[1].innerText || '').trim();

        const parts = [];
        if (title) parts.push(title);
        if (refText) parts.push(refText);
        if (desc) parts.push(`${t('section_description')}. ${desc}`);
        if (treat) parts.push(`${t('section_treatment')}. ${treat}`);
        return normalizeSpeechText(parts.join('. '));
    }

    const speakBtn = document.getElementById('result-speak-btn');
    const speakIconPlay = speakBtn?.querySelector('.speak-icon-play');
    const speakIconStop = speakBtn?.querySelector('.speak-icon-stop');
    let speechPlaying = false;
    let narakeetStopRequested = false;
    let narakeetAudio = null;

    function setSpeakButtonPlaying(on) {
        speechPlaying = on;
        if (!speakBtn) return;
        speakBtn.classList.toggle('speak-fab--playing', on);
        speakBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        speakBtn.setAttribute('aria-label', on ? t('stop_speech_aria') : t('speak_result_aria'));
        if (speakIconPlay) speakIconPlay.classList.toggle('hidden', on);
        if (speakIconStop) speakIconStop.classList.toggle('hidden', !on);
    }

    function refreshSpeakButtonI18n() {
        if (!speakBtn) return;
        speakBtn.setAttribute(
            'aria-label',
            speechPlaying ? t('stop_speech_aria') : t('speak_result_aria')
        );
    }

    function cancelResultSpeech() {
        narakeetStopRequested = true;
        // Stop Narakeet audio
        try {
            if (narakeetAudio) { narakeetAudio.pause(); narakeetAudio = null; }
        } catch (e) {}
        // Stop local Amharic audio
        try {
            if (amharicAudio) { amharicAudio.pause(); amharicAudio = null; }
        } catch (e) {}
        // Stop local Afan Oromo audio
        try {
            if (oromoAudio) { oromoAudio.pause(); oromoAudio = null; }
        } catch (e) {}
        // Stop browser TTS
        try {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (e) {}
        setSpeakButtonPlaying(false);
    }

    async function speakScanResultWithNarakeet(text, lang) {
        const proxyUrl = window.MY_PLANT_TTS_PROXY_URL;
        if (!proxyUrl) return false;
        const chunks = speechChunks(text, 850); // keep under ~1KB safety for Narakeet short content
        narakeetStopRequested = false;
        let ok = false;

        setSpeakButtonPlaying(true);
        try {
            for (let i = 0; i < chunks.length; i++) {
                if (narakeetStopRequested) break;
                const chunk = chunks[i];

                const resp = await fetch(`${proxyUrl}?lang=${encodeURIComponent(lang)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: chunk
                });
                if (!resp.ok) {
                    throw new Error(`Narakeet TTS failed (${resp.status})`);
                }

                const blob = await resp.blob();
                ok = true;
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                narakeetAudio = audio;

                await new Promise((resolve) => {
                    const cleanup = () => {
                        audio.removeEventListener('ended', onEnded);
                        audio.removeEventListener('error', onError);
                        audio.removeEventListener('pause', onPause);
                    };
                    const onEnded = () => {
                        cleanup();
                        resolve();
                    };
                    const onError = () => {
                        cleanup();
                        resolve();
                    };
                    const onPause = () => {
                        cleanup();
                        resolve();
                    };

                    audio.addEventListener('ended', onEnded);
                    audio.addEventListener('error', onError);
                    audio.addEventListener('pause', onPause);

                    audio.play().catch(() => {
                        cleanup();
                        resolve();
                    });
                });

                try {
                    URL.revokeObjectURL(url);
                } catch (e) {}

                if (narakeetStopRequested) break;
            }
        } catch (e) {
            ok = false;
        } finally {
            narakeetAudio = null;
            setSpeakButtonPlaying(false);
        }
        return ok;
    }

    // Amharic local audio files — amharic_1.m4a is the primary track
    const AMHARIC_LOCAL_AUDIO = ['amharic_1.m4a', 'amharic_1.m4a', 'amharic_2.m4a', 'amharic_3.m4a'];
    let amharicAudioIndex = 0;
    let amharicAudio = null;

    // Afan Oromo local audio file
    let oromoAudio = null;

    function playOromoLocalAudio() {
        if (oromoAudio) {
            try { oromoAudio.pause(); oromoAudio.currentTime = 0; } catch(e) {}
            oromoAudio = null;
        }
        setSpeakButtonPlaying(true);
        const audio = new Audio('afan_oromo_1.m4a');
        oromoAudio = audio;
        audio.play().catch(() => setSpeakButtonPlaying(false));
        audio.addEventListener('ended', () => { oromoAudio = null; setSpeakButtonPlaying(false); });
        audio.addEventListener('error', () => { oromoAudio = null; setSpeakButtonPlaying(false); });
    }

    function stopOromoLocalAudio() {
        if (oromoAudio) {
            try { oromoAudio.pause(); oromoAudio.currentTime = 0; } catch(e) {}
            oromoAudio = null;
        }
        setSpeakButtonPlaying(false);
    }

    function playAmharicLocalAudio() {
        // Cancel any existing playback
        if (amharicAudio) {
            try { amharicAudio.pause(); amharicAudio.currentTime = 0; } catch(e) {}
            amharicAudio = null;
        }
        setSpeakButtonPlaying(true);
        const src = AMHARIC_LOCAL_AUDIO[amharicAudioIndex % AMHARIC_LOCAL_AUDIO.length];
        // Cycle index: keep returning to 0 (amharic_1) most often by using index 0 and 1 both pointing there
        amharicAudioIndex = (amharicAudioIndex + 1) % AMHARIC_LOCAL_AUDIO.length;
        const audio = new Audio(src);
        amharicAudio = audio;
        audio.play().catch(() => setSpeakButtonPlaying(false));
        audio.addEventListener('ended', () => {
            amharicAudio = null;
            setSpeakButtonPlaying(false);
        });
        audio.addEventListener('error', () => {
            amharicAudio = null;
            setSpeakButtonPlaying(false);
        });
    }

    function stopAmharicLocalAudio() {
        if (amharicAudio) {
            try { amharicAudio.pause(); amharicAudio.currentTime = 0; } catch(e) {}
            amharicAudio = null;
        }
        setSpeakButtonPlaying(false);
    }

    function speakScanResult() {
        const code = window.MY_PLANT_I18N ? window.MY_PLANT_I18N.getLang() : 'en';

        // ── Amharic ONLY: use local pre-recorded .m4a files ──
        if (code === 'am') {
            if (speechPlaying) {
                stopAmharicLocalAudio();
                return;
            }
            playAmharicLocalAudio();
            return;
        }

        // ── Afan Oromo ONLY: use local pre-recorded .m4a file ──
        if (code === 'om') {
            if (speechPlaying) {
                stopOromoLocalAudio();
                return;
            }
            playOromoLocalAudio();
            return;
        }

        // ── All other languages ──
        if (speechPlaying) {
            cancelResultSpeech();
            return;
        }
        const text = buildResultSpeechText();
        if (!text) return;

        const speakWithBrowserTTS = () => {
            if (!window.speechSynthesis) {
                window.alert(t('tts_unsupported'));
                return;
            }
            window.speechSynthesis.cancel();

            const run = () => {
                const voice = pickVoiceForLang(code);
                const baseLang = LANG_TTS[code] || 'en-US';
                const chunks = speechChunks(text, 280);
                let idx = 0;
                const rates = { en: 0.93, ar: 0.86, om: 0.87 };
                const rate = rates[code] != null ? rates[code] : 0.9;
                const speakNext = () => {
                    if (idx >= chunks.length) {
                        setSpeakButtonPlaying(false);
                        return;
                    }
                    const utter = new SpeechSynthesisUtterance(chunks[idx]);
                    utter.lang = baseLang;
                    if (voice) utter.voice = voice;
                    utter.rate = rate;
                    utter.pitch = 1.03;
                    utter.onend = () => {
                        idx += 1;
                        speakNext();
                    };
                    utter.onerror = () => setSpeakButtonPlaying(false);
                    window.speechSynthesis.speak(utter);
                };
                setSpeakButtonPlaying(true);
                speakNext();
            };

            if (getSpeechVoices().length === 0) {
                const onVoices = () => {
                    window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
                    run();
                };
                window.speechSynthesis.addEventListener('voiceschanged', onVoices);
                window.speechSynthesis.getVoices();
                setTimeout(() => {
                    window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
                    run();
                }, 750);
            } else {
                run();
            }
        };

        speakWithBrowserTTS();
    }

    if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakScanResult();
        });
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
    }

    window.cancelResultSpeech = cancelResultSpeech;
    window.refreshSpeakButtonI18n = refreshSpeakButtonI18n;

    window.addEventListener('myplant-lang', () => {
        const st = document.querySelector('.scanning-text');
        if (st && st.dataset.i18nScan) {
            st.textContent = t(st.dataset.i18nScan);
        }
        if (typeof window.cancelResultSpeech === 'function') window.cancelResultSpeech();
        if (typeof window.refreshSpeakButtonI18n === 'function') window.refreshSpeakButtonI18n();
        if (typeof fetchHistory === 'function') fetchHistory();
        if (typeof window.refreshPlantChipBar === 'function') window.refreshPlantChipBar();
        if (document.getElementById('screen-8')?.classList.contains('active') && typeof window.renderPlantDocLibrary === 'function') {
            window.renderPlantDocLibrary();
        }
    });

    window.resetScan = resetScan;
    window.startCamera = startCamera;
    window.stopCamera = stopCamera;
    window.fetchHistory = fetchHistory;
    window.ensurePlantModel = ensureModelLoaded;
});

async function goToScreen(screenId) {
    if (typeof window.cancelResultSpeech === 'function') window.cancelResultSpeech();

    const currentActive = document.querySelector('.screen.active');
    if (currentActive && currentActive.id === 'screen-6') {
        if (typeof window.stopCamera === 'function') window.stopCamera();
    }

    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');

        if (screenId === 'screen-5') {
            if (typeof window.fetchHistory === 'function') window.fetchHistory();
        }

        if (screenId === 'screen-6') {
            if (typeof window.ensurePlantModel === 'function') {
                window.ensurePlantModel().catch(() => {});
            }
            if (typeof window.resetScan === 'function') window.resetScan();
            if (typeof window.startCamera === 'function') {
                await window.startCamera();
            }
        }

        if (screenId === 'screen-8') {
            if (typeof window.renderPlantDocLibrary === 'function') {
                window.renderPlantDocLibrary();
            }
        }
    }
}
