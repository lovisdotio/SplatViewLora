//////////////////////////////////////////////////////////////
// main.js with extended functionalities using MediaRecorder
//////////////////////////////////////////////////////////////
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DropInViewer, SceneFormat, SceneRevealMode } from '@mkkellogg/gaussian-splats-3d';
import { LumaSplatsThree } from '@lumaai/luma-web';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// Post-processing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Global variables
let scene, camera, renderer, controls;
let cross;                // the cross
let viewer;               // DropInViewer for PLY
let lumaSplats = null;    // LumaSplatsThree for Luma environments
let importedGLBs = {}; // Store multiple GLBs with unique IDs
let glbCounter = 0;    // Counter for unique GLB IDs
let axesHelper;           // Axes helper
let selectedObject = null; // UNIFIED selection variable
let glbFolderRef = null;  // Reference to the main GLB folder in dat.GUI
let loadedGLBsFolderRef = null; // Reference to the 'Loaded GLBs' subfolder
let glbControllers = {}; // Store controllers for GUI elements (delete buttons, select buttons)
let glbTransformControllers = {}; // Store controllers for scale/position/texture
let transformControls; // Declare TransformControls variable
let camAnimControllers = {}; // Declare globally for camera animation GUI controllers
let globalPauseController = null; // Reference to global pause button
let isGloballyPaused = false; // Global pause state
let plyTransformControllers = {}; // Store controllers for PLY scale/position/rotation
let plyIsAnimatingDeletion = false; // Flag for animated deletion
let lumaTransformControllers = {}; // Store controllers for Luma scale/position/rotation

// Lights
let ambientLight;
let keyLight, fillLight, backLight;
let keyLightHelper, fillLightHelper, backLightHelper;
let lightControllers = {}; // To hold GUI controllers for lights
let lightPositionControllers = {}; // To hold GUI controllers for light positions
// let selectedLight = null; // To track the currently selected light for editing - REMOVED

// Postprocessing
let composer;       // EffectComposer
let renderPass;     // RenderPass
let bloomPass;      // Bloom pass

// Pour la capture avec MediaRecorder
// For circular 360 camera mode
let angleCircular = 0;

// --- LoRA Capture State ---
let loraCaptures = new Map(); // Map of pose_id -> { dataUrl, prompt }
let isLoraCapturing = false;
let loraStatusController = null;
let loraCapturedCountController = null;
// --------------------------


// GUI parameters
const guiParams = {
  // === Scene / Camera ===
  backgroundColor: '#000000',
  cameraMode: 'orbit',   // 'orbit' ou 'circular360'
  circularSpeed: 0.001,  // vitesse pour le mode circular360
  circularRadius: 30,
  circularHeight: 10,    // hauteur pour le mode circular360
  cameraFOV: 60,         // Field Of View de la caméra
  cameraNear: 0.1,       // Near clipping plane
  cameraFar: 10000,      // Far clipping plane
  showCross: true,       // Afficher la croix
  showAxes: true,        // Afficher l'axes helper
  antialias: false,      // Antialiasing (disabled by default for performance)

  // === Cross ===
  crossStep: 0.5,

// For PLY rotation (in degrees)
plyRotationX: 0,
plyRotationY: 0,
plyRotationZ: 0,

  // === PLY (Gaussian Splats) ===
  plyURL: '',
  loadPLYFromURL: function() { loadNewPLY(guiParams.plyURL); },
  selectLocalPLY: function() {
    const fileInput = document.getElementById('plyFileInput');
    fileInput?.click();
  },
  loadSelectedLocalPLY: function() {
    const fileInput = document.getElementById('plyFileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
       alert('Select a local splat file first (.ply, .splat, .ksplat)'); return;
    }
    const file = fileInput.files[0];
    loadSelectedPLYFile(file);
    // Clear the input after initiating load
    fileInput.value = '';
  },
  deletePLY: function() { deletePLY(); },
  deletePLYAnimated: function() { deletePLYAnimated(); }, // Add animated delete function
  editPLY: function() { attachGizmoToPLY(); }, // New Edit PLY function
  stopEditPLY: function() { stopEditPLY(); }, // New Stop Edit PLY function
  plyScale: 1,
  plyPosX: 0,
  plyPosY: 1, // Set default Y position to 1
  plyPosZ: 0,
  plyRotationX: 0,
  plyRotationY: 0,
  plyRotationZ: 0,
  plyTransformMode: 'translate', // Mode for PLY gizmo

  // === GLB ===
  glbFile: null,
  loadGLB: function() {
    const fileInput = document.getElementById('glbFileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
       alert('Select a .glb file first using the button'); return;
    }
    const file = fileInput.files[0];
    importGLBFile(file);
    // Clear the input after loading
    fileInput.value = '';
  },
  glbScale: 1,
  glbPosX: 0,
  glbPosY: 0,
  glbPosZ: 0,
  glbTextureEnabled: false,
  glbTextureRepeatX: 1,
  glbTextureRepeatY: 1,
  glbTextureOffsetX: 0,
  glbTextureOffsetY: 0,
  glbRotX: 0, // Add rotation parameters
  glbRotY: 0,
  glbRotZ: 0,
  transformMode: 'translate', // Added for TransformControls mode
  transformSpace: 'world', // Added for TransformControls space
  // NEW: PBR properties for GLB
  glbMetalness: 0.5,
  glbRoughness: 0.5,
  // NEW: Emissive properties for GLB
  glbUseEmissive: false,
  glbEmissiveColor: '#000000',
  glbEmissiveIntensity: 1.0,
  // NEW: Environment reflection control
  glbEnvMapIntensity: 1.0,

  // === Lighting ===
  ambientColor: '#ffffff',
  ambientIntensity: 0.2,
  // Key Light
  keyLightColor: '#ffffff',
  keyLightIntensity: 1.5,
  keyLightX: 10,
  keyLightY: 15,
  keyLightZ: 10,
  editKeyLight: function() { selectObject(keyLight); },
  // Fill Light
  fillLightColor: '#ffffff',
  fillLightIntensity: 0.4,
  fillLightX: -10,
  fillLightY: 5,
  fillLightZ: 10,
  editFillLight: function() { selectObject(fillLight); },
  // Back Light
  backLightColor: '#ffffff',
  backLightIntensity: 0.8,
  backLightX: -5,
  backLightY: 10,
  backLightZ: -15,
  editBackLight: function() { selectObject(backLight); },
  // Helpers
  showLightHelpers: false,

  // === Environment (HDR) ===
  envMapURL: '',
  useEnvMap: false,
  envMapAsBackground: false,
  loadEnvMap: function() {
    if (!guiParams.envMapURL) { alert('Please specify an HDR URL first'); return; }
    loadEnvironmentMap(guiParams.envMapURL);
  },

  // === ToneMapping & Exposure ===
  toneMapping: 'None', // 'None' | 'ACESFilmic' | 'Reinhard'
  exposure: 1.0,

  // === Bloom Post-Processing ===
  enableBloom: false,
  bloomThreshold: 0.85,
  bloomStrength: 0.5,
  bloomRadius: 0.4,

  // NEW: Deselection function
  deselectAll: function() { deselectAll(); },

  // === PLY Fade-In ===
  plyFadeInEffect: false, // Disabled by default for faster loading

  // === Luma Splats ===
  lumaURL: 'https://lumalabs.ai/capture/ca9ea966-ca24-4ec1-ab0f-af665cb546ff',
  loadLumaFromURL: function() { loadNewLuma(guiParams.lumaURL); },
  deleteLuma: function() { deleteLuma(); },
  editLuma: function() { attachGizmoToLuma(); },
  stopEditLuma: function() { stopEditLuma(); },
  lumaScale: 1,
  lumaPosX: 0,
  lumaPosY: 0,
  lumaPosZ: 0,
  lumaRotationX: 0,
  lumaRotationY: 0,
  lumaRotationZ: 0,
  lumaTransformMode: 'translate',
  // Luma-specific parameters
  lumaParticleRevealEnabled: true,
  lumaSemanticsMask: 'all', // 'all', 'foreground', 'background'
  lumaLoadingAnimationEnabled: true,
  lumaThreeShaderIntegration: true,

  // NEW Params for Config Management
  configSaveName: "Default Config", // Name to save config as
  selectedConfigName: "", // Name of the config selected in dropdown

   // === LoRA Capture ===
   loraCameraRadius: 4,
   loraDistanceVariations: true, // Enable 3 distance variations (close/medium/wide)
   loraCloseupFactor: 0.6, // Close-up distance multiplier
   loraWideFactor: 1.8, // Wide shot distance multiplier
   loraElevations: "-30, 0, 30, 60",
   loraAzimuths: "0, 45, 90, 135, 180, 225, 270, 315",
   loraCaptureDelay: 300, // ms between captures
  loraCaptureStatus: "Ready",
  loraCapturedCount: 0,
  loraExportTxt: true, // Export txt files with captions
  startLoraCapture: function() { startLoraCapture(); },
  downloadLoraDataset: function() { downloadLoraDataset(); }
};

// --- Constants ---
// const LOCAL_STORAGE_KEY = 'volumetricViewerConfig'; // Old key for single config
const CONFIGS_STORAGE_KEY = 'volumetricViewerConfigs'; // New key for multiple configs object
const SCENE_DATA_VERSION = '1.0'; // Version for scene data format

//////////////////////////////
// INIT
//////////////////////////////
init();
function init() {
  // Création de la scène
  scene = new THREE.Scene();
  scene.background = new THREE.Color(guiParams.backgroundColor);

  // Création de la caméra
  camera = new THREE.PerspectiveCamera(
    guiParams.cameraFOV,
    window.innerWidth / window.innerHeight,
    guiParams.cameraNear,
    guiParams.cameraFar
  );
  camera.position.set(20, 20, 20);

  // Création du renderer
  renderer = new THREE.WebGLRenderer({ antialias: guiParams.antialias, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = guiParams.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  // Création des OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // Initialisation des lumières
  initLighting();

  // Axes Helper - Grey color
  axesHelper = new THREE.AxesHelper(20);
  // Set all axes to grey color
  const greyColor = new THREE.Color(0x555555);
  axesHelper.setColors(greyColor, greyColor, greyColor);
  scene.add(axesHelper);

  // --- Initialize TransformControls ---
  transformControls = new TransformControls(camera, renderer.domElement);
  scene.add(transformControls);

  transformControls.addEventListener('dragging-changed', function (event) {
    controls.enabled = !event.value; // Disable OrbitControls while dragging
  });

  transformControls.addEventListener('objectChange', function () {
      // Use 'objectChange' for real-time GUI update (can be laggy)
      // Call the appropriate update function based on the attached object
      if (!selectedObject) return;

      const type = selectedObject.userData.type;
      switch(type) {
          case 'glb':
          updateGUIFromTransformControls();
              break;
          case 'ply':
          updatePlyGUIFromTransformControls();
              break;
          case 'luma':
          updateLumaGUIFromTransformControls();
              break;
          case 'light':
              updateLightGUIFromTransform();
              break;
      }
  });

  // Add this event listener for click-to-select
  renderer.domElement.addEventListener('click', onObjectClick, false);

  // Set initial mode and space from guiParams
  transformControls.setMode(guiParams.transformMode);
  transformControls.setSpace(guiParams.transformSpace);
  // -------------------------------------

  // Création de la croix
  createCross();
  cross.visible = guiParams.showCross;

  // Chargement du PLY (Gaussian Splats)
  // Remove initial viewer creation - it will be created in loadNewPLY
  /*
  viewer = new DropInViewer({
    selfDrivenMode: false,
    logLevel: 4,
    sharedMemoryForWorkers: false,
    gpuAcceleratedSort: false,
  });
  viewer.scale.set(-1, -1, 1);
  scene.add(viewer);
  */
  viewer = null; // Initialize viewer as null

  // Événements
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyPress);

  // Post-processing
  initPostprocessing();

  // Lancement de l'animation
  renderer.setAnimationLoop(animate);

  // Configuration de dat.GUI
  setupDatGUI();

  // --- Load Configuration on Startup ---
  // Remove auto-load
  // loadConfiguration(); 
  // Populate dropdown with existing configs
  populateConfigDropdown();
  // -------------------------------------
}

//////////////////////////////
// onObjectClick (NEW) - Handles selecting/deselecting objects by clicking them
//////////////////////////////
function onObjectClick(event) {
    // If we are dragging the transform controls, don't register a click
    if (transformControls && transformControls.dragging) {
        return;
    }

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Create a list of all selectable objects in the scene
    const selectableObjects = [];
    if (viewer) {
        selectableObjects.push(viewer); // The PLY splat viewer
    }
    if (lumaSplats) {
        selectableObjects.push(lumaSplats); // The Luma splat viewer
    }
    Object.values(importedGLBs).forEach(glb => {
        if (glb) selectableObjects.push(glb); // All loaded GLB models
    });
    // Add light helpers to selectable objects if they are visible
    if (guiParams.showLightHelpers) {
        selectableObjects.push(keyLightHelper, fillLightHelper, backLightHelper);
    }

    const intersects = raycaster.intersectObjects(selectableObjects, true);

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;

        // An intersection might be a child mesh of the selectable object.
        // We need to traverse up the hierarchy to find the actual root object
        // that is in our `selectableObjects` list.
        let rootObject = null;
        let tempObject = clickedObject;
        while (tempObject) {
            if (selectableObjects.includes(tempObject)) {
                rootObject = tempObject;
                break;
            }
            tempObject = tempObject.parent;
        }

        if (rootObject) {
            // If the clicked object is already the one being transformed, detach the gizmo (un-edit).
            if (selectedObject === rootObject) {
                deselectObject();
            } else {
                // A new object was clicked, so attach the gizmo to it (select for editing).
                selectObject(rootObject);
            }
        }
    } else {
        // If the click is on an empty space, deselect whatever is selected.
        deselectObject();
    }
}

//////////////////////////////
// createCross
//////////////////////////////
function createCross() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, 0, 0,   1, 0, 0,   0, -1, 0,   0, 1, 0
  ], 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  cross = new THREE.LineSegments(geo, mat);
  scene.add(cross);
}

//////////////////////////////
// onWindowResize
//////////////////////////////
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  initPostprocessing(); // Re-init composer on resize
  // Update TransformControls as well
  if (transformControls) {
      transformControls.camera = camera;
      transformControls.domElement = renderer.domElement;
  }
}

//////////////////////////////
// onKeyPress => déplacement de la croix
//////////////////////////////
function onKeyPress(e) {
  const stp = guiParams.crossStep;
  switch(e.key) {
    case 'ArrowUp':    cross.position.y += stp; break;
    case 'ArrowDown':  cross.position.y -= stp; break;
    case 'ArrowLeft':  cross.position.x -= stp; break;
    case 'ArrowRight': cross.position.x += stp; break;
    default: break;
  }
}

//////////////////////////////
// initPostprocessing
//////////////////////////////
function initPostprocessing() {
  composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    guiParams.bloomStrength,
    guiParams.bloomRadius,
    guiParams.bloomThreshold
  );
  if (guiParams.enableBloom) {
    composer.addPass(bloomPass);
  }
}

//////////////////////////////
// recreateRenderer - Toggle antialias
//////////////////////////////
function recreateRenderer() {
  // Store current renderer settings
  const currentToneMapping = renderer.toneMapping;
  const currentExposure = renderer.toneMappingExposure;
  
  // Remove old canvas
  const oldCanvas = renderer.domElement;
  oldCanvas.parentNode.removeChild(oldCanvas);
  
  // Dispose old renderer
  renderer.dispose();
  
  // Create new renderer with updated antialias setting
  renderer = new THREE.WebGLRenderer({ antialias: guiParams.antialias, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = currentToneMapping;
  renderer.toneMappingExposure = currentExposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);
  
  // Recreate controls with new renderer
  controls.dispose();
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  
  // Recreate transform controls with new renderer
  scene.remove(transformControls);
  transformControls.dispose();
  transformControls = new TransformControls(camera, renderer.domElement);
  scene.add(transformControls);
  
  transformControls.addEventListener('dragging-changed', function (event) {
    controls.enabled = !event.value;
  });
  
  // Reinitialize postprocessing
  initPostprocessing();
  
  console.log(`Antialias ${guiParams.antialias ? 'enabled' : 'disabled'} - Renderer recreated`);
}

//////////////////////////////
// animate => rendu + mises à jour
//////////////////////////////
let prevTime = performance.now(); // Initialize prevTime globally before animate uses it

function animate(time) {
  const currentTime = performance.now();
  const dt = (currentTime - prevTime) * 0.001; // Now prevTime is defined
  prevTime = currentTime;

  // Only enable OrbitControls if TransformControls is NOT dragging
  // AND cameraMode is 'orbit'
  const orbitControlsShouldBeEnabled = guiParams.cameraMode === 'orbit' && !transformControls.dragging;
  if (controls.enabled !== orbitControlsShouldBeEnabled) {
      controls.enabled = orbitControlsShouldBeEnabled;
  }
  // Update controls ONLY if they are enabled
  if (controls.enabled && !isGloballyPaused) {
      controls.update();
  }

  // --- Handle PLY Animated Deletion --- 
  if (plyIsAnimatingDeletion && viewer) {
      const currentScale = Math.abs(viewer.scale.x); // Use absolute value
      const targetScale = 0.001;
      const animationSpeed = 5.0; // Controls how fast it shrinks (adjust as needed)
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, dt * animationSpeed);
      
      // Apply new scale (maintaining negative signs)
      viewer.scale.set(-newScale, -newScale, newScale);
      
      // Check if animation is complete
      if (newScale <= targetScale * 1.1) { // Use a small tolerance
           plyIsAnimatingDeletion = false;
           deletePLY(); // Call the actual deletion function
      }
  } // --- End PLY Animated Deletion ---

  updateCameraMode(dt);

  // Rendu via composer si Bloom activé, sinon directement
  if (guiParams.enableBloom) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }

  // (MediaRecorder s'occupe de l'enregistrement)
}

function updateCameraMode(dt) {
  if (guiParams.cameraMode === 'orbit') return;
  if (guiParams.cameraMode === 'circular360') {
    const x = guiParams.circularRadius * Math.cos(angleCircular);
    const z = guiParams.circularRadius * Math.sin(angleCircular);
    const y = guiParams.circularHeight;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    angleCircular += guiParams.circularSpeed * dt;
  }
}

//////////////////////////////
// Gaussian Splats (PLY, SPLAT, KSPLAT)
//////////////////////////////
// Helper function to detect format from URL or filename
function detectSplatFormat(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('.ksplat')) return SceneFormat.KSplat;
  if (urlLower.includes('.splat')) return SceneFormat.Splat;
  return SceneFormat.Ply; // Default to PLY
}

// Load from URL (HTTP/HTTPS or Data URL)
async function loadNewPLY(url, format = null) {
  try {
    deletePLY(); // Clean up existing splat viewer first

    // Auto-detect format if not specified
    const sceneFormat = format || detectSplatFormat(url);
    const formatName = sceneFormat === SceneFormat.KSplat ? 'KSPLAT' : 
                       sceneFormat === SceneFormat.Splat ? 'SPLAT' : 'PLY';
    console.log(`Loading Gaussian Splat (${formatName}):`, url.startsWith('data:') ? '(local file)' : url);

    // Determine reveal mode based on GUI
    const revealMode = guiParams.plyFadeInEffect ? 
                       SceneRevealMode.Default : 
                       SceneRevealMode.Instant;

    // Define constructor options
    const viewerOptions = {
        selfDrivenMode: false,
        logLevel: 4,
        sharedMemoryForWorkers: false,
        gpuAcceleratedSort: false,
        sceneRevealMode: revealMode
    };

    if (guiParams.plyFadeInEffect) {
        viewerOptions.sceneFadeInRateMultiplier = 0.05;
    }

    // Create viewer instance
    viewer = new DropInViewer(viewerOptions);
    scene.add(viewer);

    // Options for addSplatScene
    const options = {
        showLoadingUI: true,
        splatAlphaRemovalThreshold: 1,
        format: sceneFormat,
        progressiveLoad: guiParams.plyFadeInEffect
    };

    console.log('Loading with options:', options);
    await viewer.addSplatScene(url, options); 

    console.log(`${formatName} loaded successfully`);
    applyPLYTransform();

  } catch (err) {
    console.error('Failed to load Gaussian Splat:', err);
    if (viewer) {
        scene.remove(viewer);
        if(typeof viewer.dispose === 'function') viewer.dispose();
        viewer = null;
    }
    alert(`Failed to load Gaussian Splat: ${err.message}`);
  }
}

// Reads file as Data URL and calls loadNewPLY with detected format
function loadSelectedPLYFile(file) {
  if (!file) return;
  
  // Detect format from filename
  const format = detectSplatFormat(file.name);
  const formatName = format === SceneFormat.KSplat ? 'KSPLAT' : 
                     format === SceneFormat.Splat ? 'SPLAT' : 'PLY';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    if (!dataUrl || typeof dataUrl !== 'string') {
        console.error('Failed to read file as Data URL.');
        alert('Error: Could not read file data.');
        return;
    }
    console.log(`Read local ${formatName} as Data URL: ${file.name} (length: ${dataUrl.length})`);
    // Call the main loading function with the Data URL and detected format
    loadNewPLY(dataUrl, format);
  };
  reader.onerror = (err) => {
    console.error('Error reading local splat file:', err);
    alert('Error reading the selected file.');
  };
  reader.readAsDataURL(file); 
}

function applyPLYTransform() {
  if (!viewer) return;
  const s = guiParams.plyScale;
  viewer.scale.set(-s, -s, s);
  viewer.position.set(guiParams.plyPosX, guiParams.plyPosY, guiParams.plyPosZ);
  viewer.rotation.set(
    THREE.MathUtils.degToRad(guiParams.plyRotationX),
    THREE.MathUtils.degToRad(guiParams.plyRotationY),
    THREE.MathUtils.degToRad(guiParams.plyRotationZ)
  );
}

//////////////////////////////
// Luma Splats
//////////////////////////////
async function loadNewLuma(url) {
  try {
    console.log('Loading Luma from URL:', url);

    // Clean up existing Luma splats first
    deleteLuma();

    // Import LumaSplatsSemantics for semantic mask if needed
    const { LumaSplatsSemantics } = await import('@lumaai/luma-web');

    // Create new LumaSplatsThree instance
    lumaSplats = new LumaSplatsThree({
      source: url,
      particleRevealEnabled: guiParams.lumaParticleRevealEnabled,
      loadingAnimationEnabled: guiParams.lumaLoadingAnimationEnabled,
      enableThreeShaderIntegration: guiParams.lumaThreeShaderIntegration,
    });

    // Set semantic mask based on GUI parameter
    if (guiParams.lumaSemanticsMask === 'foreground') {
      lumaSplats.semanticsMask = LumaSplatsSemantics.FOREGROUND;
    } else if (guiParams.lumaSemanticsMask === 'background') {
      lumaSplats.semanticsMask = LumaSplatsSemantics.BACKGROUND;
    } else {
      // 'all' - use both foreground and background
      lumaSplats.semanticsMask = LumaSplatsSemantics.FOREGROUND | LumaSplatsSemantics.BACKGROUND;
    }

    // Add metadata for selection system
    lumaSplats.userData.type = 'luma';

    // Add to scene
    scene.add(lumaSplats);

    // Apply transform
    applyLumaTransform();

    console.log('Luma loaded successfully from:', url);

    // Wait for loading to complete and apply any pending data
    lumaSplats.onLoad = () => {
      console.log('Luma splats fully loaded');
      // Apply pending Luma data if available
      if (window.pendingLumaData) {
        applyPendingLumaData();
      }
    };

  } catch (err) {
    console.error('Failed to load Luma:', err);
    if (lumaSplats) {
      scene.remove(lumaSplats);
      if (typeof lumaSplats.dispose === 'function') lumaSplats.dispose();
      lumaSplats = null;
    }
    alert(`Failed to load Luma: ${err.message}`);
  }
}

function applyLumaTransform() {
  if (!lumaSplats) return;
  const s = guiParams.lumaScale;
  lumaSplats.scale.set(s, s, s);
  lumaSplats.position.set(guiParams.lumaPosX, guiParams.lumaPosY, guiParams.lumaPosZ);
  lumaSplats.rotation.set(
    THREE.MathUtils.degToRad(guiParams.lumaRotationX),
    THREE.MathUtils.degToRad(guiParams.lumaRotationY),
    THREE.MathUtils.degToRad(guiParams.lumaRotationZ)
  );
}

function deleteLuma() {
  if (lumaSplats) {
    scene.remove(lumaSplats);
    if (typeof lumaSplats.dispose === 'function') {
      lumaSplats.dispose();
    }
    lumaSplats = null;
    console.log('Luma splats deleted');

    // If the deleted Luma was the selected object, deselect it
    if (selectedObject && selectedObject.userData.type === 'luma') {
      deselectObject();
    }
  }
}

function attachGizmoToLuma() {
  if (!lumaSplats) {
    alert('No Luma splats loaded to edit');
    return;
  }
  selectObject(lumaSplats);
}

function stopEditLuma() {
  if (selectedObject && selectedObject.userData.type === 'luma') {
    deselectObject();
  }
}

function updateLumaGUIFromTransformControls() {
  if (!lumaSplats || !transformControls.object) return;

  // Update GUI parameters from the actual object transform
  const position = lumaSplats.position;
  const scale = lumaSplats.scale;
  const rotation = lumaSplats.rotation;

  guiParams.lumaPosX = position.x;
  guiParams.lumaPosY = position.y;
  guiParams.lumaPosZ = position.z;
  guiParams.lumaScale = scale.x; // Assuming uniform scale
  guiParams.lumaRotationX = THREE.MathUtils.radToDeg(rotation.x);
  guiParams.lumaRotationY = THREE.MathUtils.radToDeg(rotation.y);
  guiParams.lumaRotationZ = THREE.MathUtils.radToDeg(rotation.z);

  // Update GUI controllers if they exist
  if (lumaTransformControllers.posX) lumaTransformControllers.posX.updateDisplay();
  if (lumaTransformControllers.posY) lumaTransformControllers.posY.updateDisplay();
  if (lumaTransformControllers.posZ) lumaTransformControllers.posZ.updateDisplay();
  if (lumaTransformControllers.scale) lumaTransformControllers.scale.updateDisplay();
  if (lumaTransformControllers.rotX) lumaTransformControllers.rotX.updateDisplay();
  if (lumaTransformControllers.rotY) lumaTransformControllers.rotY.updateDisplay();
  if (lumaTransformControllers.rotZ) lumaTransformControllers.rotZ.updateDisplay();
}

function applyPendingLumaData() {
  if (!window.pendingLumaData || !lumaSplats) return;

  const data = window.pendingLumaData;
  
  // Apply transform
  guiParams.lumaPosX = data.lumaPosX || 0;
  guiParams.lumaPosY = data.lumaPosY || 0;
  guiParams.lumaPosZ = data.lumaPosZ || 0;
  guiParams.lumaScale = data.lumaScale || 1;
  guiParams.lumaRotationX = data.lumaRotationX || 0;
  guiParams.lumaRotationY = data.lumaRotationY || 0;
  guiParams.lumaRotationZ = data.lumaRotationZ || 0;

  applyLumaTransform();

  // Apply Luma-specific settings
  if (data.lumaSemanticsMask !== undefined) {
    guiParams.lumaSemanticsMask = data.lumaSemanticsMask;
    // Re-apply semantic mask
    loadNewLuma(guiParams.lumaURL);
  }

  // Clear pending data
  delete window.pendingLumaData;
  
  console.log('Applied pending Luma data');
}

//////////////////////////////
// GLB
//////////////////////////////
function importGLBFile(file) {
  const reader = new FileReader();
  const loader = new GLTFLoader();
  reader.onload = e => {
    loader.parse(e.target.result, '', (gltf) => {
      // Generate a unique ID
      const id = `glb-${glbCounter++}`;
      const newGLB = gltf.scene;
      newGLB.userData.id = id; // Store ID for reference
      newGLB.userData.type = 'glb'; // Store type for selection
      newGLB.userData.fileName = file.name; // Store original file name

      // Add to our collection and the scene
      importedGLBs[id] = newGLB;
      scene.add(newGLB);

      console.log(`GLB loaded with ID: ${id}`);

      // Apply initial transform (using current GUI values, might need adjustment)
      applySingleGLBTransform(newGLB);

      // Update the GUI dynamically
      addGLBToGUI(id, file.name); // Pass file.name for display

      // Select the newly loaded GLB by default
      selectObject(newGLB);

      // Apply pending GLB data if available
      if (window.pendingGLBData) {
          applyPendingGLBData(newGLB, file.name);
      }

      // Optional: Apply texture settings if enabled
      if (guiParams.glbTextureEnabled) {
         applySingleGLBTextureSettings(newGLB);
      }
    }, (err) => {
      console.error('Error parsing GLB:', err);
    });
  };
  reader.readAsArrayBuffer(file);
}

// Apply transform to a single GLB object
function applySingleGLBTransform(glbObject) {
  if (!glbObject) return;
  glbObject.scale.set(guiParams.glbScale, guiParams.glbScale, guiParams.glbScale);
  glbObject.position.set(guiParams.glbPosX, guiParams.glbPosY, guiParams.glbPosZ);
}

// Apply texture settings to a single GLB object
function applySingleGLBTextureSettings(glbObject) {
    if (!glbObject) return;
    glbObject.traverse(child => {
        if (child.isMesh && child.material && child.material.map) {
            child.material.map.repeat.set(guiParams.glbTextureRepeatX, guiParams.glbTextureRepeatY);
            child.material.map.offset.set(guiParams.glbTextureOffsetX, guiParams.glbTextureOffsetY);
            child.material.map.needsUpdate = true;
        }
    });
}

// Function to delete a specific GLB by its ID
function deleteGLB(id) {
  const glbToRemove = importedGLBs[id];
  if (glbToRemove) {
    scene.remove(glbToRemove);

    // --- Resource Disposal ---
    glbToRemove.traverse(object => {
        if (!object.isMesh) return; // Only handle meshes

        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => {
                // Dispose textures associated with the material
                for (const key in material) {
                    const value = material[key];
                    if (value && typeof value === 'object' && value.isTexture) {
                        value.dispose();
                    }
                }
                material.dispose();
            });
        }
    });
    // -------------------------

    delete importedGLBs[id];
    console.log(`GLB deleted: ${id}`);
    // Remove from GUI
    removeGLBFromGUI(id);

    // If the deleted GLB was the selected one, deselect it
    if (selectedObject && selectedObject.userData.id === id) {
      deselectObject();
    }

  } else {
    console.warn(`GLB with ID ${id} not found for deletion.`);
  }
}

//////////////////////////////
// Environment (HDR)
//////////////////////////////
function loadEnvironmentMap(url) {
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(url, (hdrTex) => {
    hdrTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = guiParams.useEnvMap ? hdrTex : null;
    scene.background = guiParams.envMapAsBackground ? hdrTex : new THREE.Color(guiParams.backgroundColor);
    console.log('Loaded env map:', url);
  }, undefined, (err) => {
    console.error('Failed to load HDR:', err);
  });
}

//////////////////////////////
// LoRA Capture Functions
//////////////////////////////

const LORA_AZIM_DESC = {
  0: "front view",
  45: "front-right quarter view",
  90: "right side view",
  135: "back-right quarter view",
  180: "back view",
  225: "back-left quarter view",
  270: "left side view",
  315: "front-left quarter view"
};

 const LORA_ELEV_DESC = {
   "-30": "low-angle shot",
   0: "eye-level shot",
   30: "elevated shot",
   60: "high-angle shot",
   90: "bird's-eye view"
 };
 
 const LORA_DISTANCE_DESC = {
   "close": "close-up",
   "medium": "medium shot", 
   "wide": "wide shot"
 };

function getLoraAzimDesc(azim) {
  // Find closest match
  const keys = Object.keys(LORA_AZIM_DESC).map(Number);
  let closest = keys[0];
  for (const k of keys) {
    if (Math.abs(k - azim) < Math.abs(closest - azim)) closest = k;
  }
  return LORA_AZIM_DESC[closest] || `${azim}° view`;
}

function getLoraElevDesc(elev) {
  if (elev >= 75) return "bird's-eye view";
  if (elev >= 45) return "high-angle shot";
  if (elev >= 15) return "elevated shot";
  if (elev >= -15) return "eye-level shot";
  return "low-angle shot";
}

function updateLoraStatus(status) {
  guiParams.loraCaptureStatus = status;
  if (loraStatusController) {
    loraStatusController.updateDisplay();
  }
}

function updateLoraCapturedCount(count) {
  guiParams.loraCapturedCount = count;
  if (loraCapturedCountController) {
    loraCapturedCountController.updateDisplay();
  }
}

async function startLoraCapture() {
  if (isLoraCapturing) {
    console.log("LoRA capture already in progress");
    return;
  }

   // Parse elevations and azimuths
   const elevations = guiParams.loraElevations.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
   const azimuths = guiParams.loraAzimuths.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
   
   if (elevations.length === 0 || azimuths.length === 0) {
     alert("Please specify valid elevations and azimuths (comma-separated numbers)");
     return;
   }

   // Calculate distances based on settings
   const baseRadius = guiParams.loraCameraRadius;
   const distances = guiParams.loraDistanceVariations ? [
     { key: "close", radius: baseRadius * guiParams.loraCloseupFactor },
     { key: "medium", radius: baseRadius * 1.0 },
     { key: "wide", radius: baseRadius * guiParams.loraWideFactor }
   ] : [
     { key: "medium", radius: baseRadius }
   ];

   const totalPoses = elevations.length * azimuths.length * distances.length;
   console.log(`Starting LoRA capture: ${totalPoses} poses (${elevations.length} elevations x ${azimuths.length} azimuths x ${distances.length} distances)`);
   
   // Test render first to make sure everything works
   updateLoraStatus("Testing render...");
   renderer.render(scene, camera);
   const testDataUrl = renderer.domElement.toDataURL('image/png', 1.0);
   if (testDataUrl.length < 1000) {
     alert("Warning: Test render produced a very small image. Make sure you have content in your scene!");
     console.warn("Test render data URL length:", testDataUrl.length);
   }
   
   isLoraCapturing = true;
   loraCaptures.clear();
   updateLoraCapturedCount(0);
   
   const delay = guiParams.loraCaptureDelay;
   
   // Store original camera position
   const originalPos = camera.position.clone();
   const originalTarget = controls.target.clone();
   
   // First, capture the reference/START image (front view, eye-level, medium shot)
   updateLoraStatus("Capturing reference image...");
   
   // Position camera for reference image
   const refDistance = guiParams.loraCameraRadius; // Medium shot distance
   camera.position.set(0, 0, refDistance); // Front view, eye-level
   camera.lookAt(0, 0, 0);
   controls.target.set(0, 0, 0);
   controls.update();
   
   // Wait and render reference image
   await new Promise(r => setTimeout(r, Math.max(delay, 100)));
   renderer.render(scene, camera);
   await new Promise(r => requestAnimationFrame(r));
   renderer.render(scene, camera);
   await new Promise(r => requestAnimationFrame(r));
   renderer.render(scene, camera);
   
   // Capture reference image
   let referenceDataUrl = renderer.domElement.toDataURL('image/png', 1.0);
   if (referenceDataUrl.length < 1000) {
     console.warn("Reference image seems too small, retrying...");
     await new Promise(r => setTimeout(r, 500));
     renderer.render(scene, camera);
     referenceDataUrl = renderer.domElement.toDataURL('image/png', 1.0);
   }
   
   console.log("Reference image captured successfully");
   
   let captureCount = 0;
   
   for (const distance of distances) {
     for (const elev of elevations) {
       for (const azim of azimuths) {
         if (!isLoraCapturing) break; // Allow cancellation
         
         captureCount++;
         const paddedNumber = String(captureCount).padStart(4, '0');
         const randomKey = Math.random().toString(36).substring(2, 8);
         
        updateLoraStatus(`Capturing ${captureCount}/${totalPoses}... (${distance.key})`);
        
        // Adjust negative elevations based on distance to prevent camera going underground
        // Close-up: full angle (-30°), Medium: 2/3 (-20°), Wide: 1/3 (-10°)
        let adjustedElev = elev;
        if (elev < 0) {
          if (distance.key === "medium") {
            adjustedElev = elev * (2/3); // -30° becomes -20°
          } else if (distance.key === "wide") {
            adjustedElev = elev * (1/3); // -30° becomes -10°
          }
          // close-up keeps the full negative angle
        }
        
        // Calculate camera position with current distance
        const elevRad = adjustedElev * Math.PI / 180;
        const azimRad = azim * Math.PI / 180;
         
         const x = distance.radius * Math.cos(elevRad) * Math.sin(azimRad);
         const y = distance.radius * Math.sin(elevRad);
         const z = distance.radius * Math.cos(elevRad) * Math.cos(azimRad);
         
         // Set camera position
         camera.position.set(x, y, z);
         camera.lookAt(0, 0, 0);
         controls.target.set(0, 0, 0);
         controls.update();
         
         // Wait for position to settle
         await new Promise(r => setTimeout(r, Math.max(delay, 100)));
         
         // FORCE MULTIPLE RENDERS to ensure everything is properly updated
         renderer.render(scene, camera);
         await new Promise(r => requestAnimationFrame(r)); // Wait for frame
         renderer.render(scene, camera);
         await new Promise(r => requestAnimationFrame(r)); // Wait for another frame
         renderer.render(scene, camera); // Final render
         
         // Create START/END filename system
         const baseId = `${paddedNumber}-${randomKey}`;
         
         const azimDesc = getLoraAzimDesc(azim);
         const elevDesc = getLoraElevDesc(elev);
         const distanceDesc = LORA_DISTANCE_DESC[distance.key];
         const prompt = `<sks> ${azimDesc} ${elevDesc} ${distanceDesc}`;
         
         // Get END image data AFTER forcing render
         const endDataUrl = renderer.domElement.toDataURL('image/png', 1.0); // Max quality
         
         // Verify the END image is not empty/black
         let finalEndDataUrl = endDataUrl;
         if (endDataUrl.length < 1000) {
           console.warn(`END image seems too small for pose ${baseId}, retrying...`);
           // Retry with longer delay
           await new Promise(r => setTimeout(r, 500));
           renderer.render(scene, camera);
           finalEndDataUrl = renderer.domElement.toDataURL('image/png', 1.0);
         }
         
        // Store both START and END images with the same base ID
        loraCaptures.set(baseId, { 
          startDataUrl: referenceDataUrl, // Always the same reference image
          endDataUrl: finalEndDataUrl,    // The specific angle/distance image
          prompt, 
          azim, 
          elev,                           // Original elevation from settings
          adjustedElev,                   // Actual elevation used (adjusted for distance)
          distance: distance.key 
        });
         
        updateLoraCapturedCount(captureCount);
        const elevInfo = elev < 0 ? ` [adjusted: ${adjustedElev.toFixed(1)}°]` : '';
        console.log(`Captured pair: ${baseId} (${prompt})${elevInfo}`);
       }
     }
   }
  
  // Restore original camera position
  camera.position.copy(originalPos);
  controls.target.copy(originalTarget);
  controls.update();
  
  isLoraCapturing = false;
  updateLoraStatus(`Done! ${captureCount} captures`);
  console.log(`LoRA capture complete: ${captureCount} images`);
}

async function downloadLoraDataset() {
  if (loraCaptures.size === 0) {
    alert("No captures to download. Run capture first!");
    return;
  }
  
  updateLoraStatus("Creating ZIP file...");
  
   const timestamp = new Date().toISOString().slice(0, 10);
  
  // Check if JSZip is available
  if (typeof JSZip === 'undefined') {
    console.error("JSZip not loaded, falling back to individual downloads");
    await downloadLoraDatasetIndividual();
    return;
  }
  
   const zip = new JSZip();
   const folder = zip.folder(`lora_dataset_sks`);
  
   // Add each START/END image pair and prompt to the ZIP
   let count = 0;
   for (const [baseId, data] of loraCaptures) {
     count++;
     updateLoraStatus(`Adding to ZIP: ${count}/${loraCaptures.size}...`);
     
     // Convert START image dataURL to blob
     const startImageData = data.startDataUrl.split(',')[1]; // Remove "data:image/png;base64,"
     folder.file(`${baseId}_start.png`, startImageData, { base64: true });
     
     // Convert END image dataURL to blob  
     const endImageData = data.endDataUrl.split(',')[1]; // Remove "data:image/png;base64,"
     folder.file(`${baseId}_end.png`, endImageData, { base64: true });
     
     // Add the prompt text file (if enabled)
     if (guiParams.loraExportTxt) {
       folder.file(`${baseId}.txt`, data.prompt);
     }
   }
  
   // Add config JSON
   const config = {
     trigger_word: "sks",
     camera_radius: guiParams.loraCameraRadius,
     distance_variations: guiParams.loraDistanceVariations,
     closeup_factor: guiParams.loraCloseupFactor,
     wide_factor: guiParams.loraWideFactor,
     elevations: guiParams.loraElevations,
     azimuths: guiParams.loraAzimuths,
     total_captures: loraCaptures.size,
     created_at: new Date().toISOString(),
     reference_image: "front view eye-level medium shot",
     file_format: "START/END pairs with shared prompt",
     txt_captions_included: guiParams.loraExportTxt,
     captures: Array.from(loraCaptures.entries()).map(([id, data]) => ({
       id,
       start_image: `${id}_start.png`,
       end_image: `${id}_end.png`, 
       prompt_file: guiParams.loraExportTxt ? `${id}.txt` : null,
       azimuth: data.azim,
       elevation: data.elev,
       distance: data.distance,
       prompt: data.prompt
     }))
   };
  folder.file("dataset_config.json", JSON.stringify(config, null, 2));
  
  // Generate and download the ZIP
  updateLoraStatus("Generating ZIP...");
  
  try {
    const zipBlob = await zip.generateAsync({ 
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    }, (metadata) => {
      updateLoraStatus(`Compressing: ${Math.round(metadata.percent)}%`);
    });
    
    // Download the ZIP
     const link = document.createElement('a');
     link.href = URL.createObjectURL(zipBlob);
     link.download = `lora_dataset_sks_${timestamp}.zip`;
     link.click();
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    
    updateLoraStatus(`✅ ZIP downloaded! (${loraCaptures.size} images)`);
    console.log(`Downloaded ZIP with ${loraCaptures.size} images + prompts`);
    
  } catch (error) {
    console.error("ZIP generation failed:", error);
    updateLoraStatus("ZIP failed, trying individual...");
    await downloadLoraDatasetIndividual();
  }
}

// Fallback: download files individually
async function downloadLoraDatasetIndividual() {
  
   let downloadCount = 0;
   for (const [baseId, data] of loraCaptures) {
     // Download START image
     const startLink = document.createElement('a');
     startLink.href = data.startDataUrl;
     startLink.download = `${baseId}_start.png`;
     startLink.click();
     
     // Download END image
     const endLink = document.createElement('a');
     endLink.href = data.endDataUrl;
     endLink.download = `${baseId}_end.png`;
     endLink.click();
     
     // Download prompt (if enabled)
     if (guiParams.loraExportTxt) {
       const txtBlob = new Blob([data.prompt], { type: 'text/plain' });
       const txtLink = document.createElement('a');
       txtLink.href = URL.createObjectURL(txtBlob);
       txtLink.download = `${baseId}.txt`;
       txtLink.click();
     }
     
     downloadCount++;
     updateLoraStatus(`Downloading ${downloadCount}/${loraCaptures.size}...`);
     
     await new Promise(r => setTimeout(r, 200));
   }
  
   // Download config JSON
   const config = {
     trigger_word: "sks",
     camera_radius: guiParams.loraCameraRadius,
     distance_variations: guiParams.loraDistanceVariations,
     closeup_factor: guiParams.loraCloseupFactor,
     wide_factor: guiParams.loraWideFactor,
     elevations: guiParams.loraElevations,
     azimuths: guiParams.loraAzimuths,
     reference_image: "front view eye-level medium shot", 
     file_format: "START/END pairs with shared prompt",
     txt_captions_included: guiParams.loraExportTxt,
     captures: Array.from(loraCaptures.entries()).map(([id, data]) => ({
       id,
       start_image: `${id}_start.png`,
       end_image: `${id}_end.png`,
       prompt_file: guiParams.loraExportTxt ? `${id}.txt` : null,
       azimuth: data.azim,
       elevation: data.elev,
       distance: data.distance,
       prompt: data.prompt
     }))
   };
  
  const configBlob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
   const configLink = document.createElement('a');
   configLink.href = URL.createObjectURL(configBlob);
   configLink.download = `lora_dataset_sks_config.json`;
   configLink.click();
  
  updateLoraStatus(`Downloaded ${loraCaptures.size} files!`);
}

//////////////////////////////
// dat.GUI Setup
//////////////////////////////
function setupDatGUI() {
  const gui = new dat.GUI({ width: 400 });
  window.datGuiInstance = gui; // Store GUI instance globally for refresh on load

  // --- Add Save/Load Buttons at Root ---
  // Remove old buttons
  // gui.add({ saveConfig: saveConfiguration }, 'saveConfig').name('Save Config (localStorage)');
  // gui.add({ loadConfig: loadConfiguration }, 'loadConfig').name('Load Config (localStorage)');
  // -------------------------------------

  // --- NEW Configuration Management Folder ---
  const fConfig = gui.addFolder('Configuration Management');
  fConfig.add(guiParams, 'configSaveName').name('Save Name');
  fConfig.add({ saveConfigurationAs: saveConfigurationAs }, 'saveConfigurationAs').name('Save Config As...');
  
  // Dropdown for selecting config (options added dynamically)
  camAnimControllers.configSelect = fConfig.add(guiParams, 'selectedConfigName', []).name('Load/Delete Name');
  
  fConfig.add({ loadSelectedConfiguration: loadSelectedConfiguration }, 'loadSelectedConfiguration').name('Load Selected Config');
  fConfig.add({ deleteSelectedConfiguration: deleteSelectedConfiguration }, 'deleteSelectedConfiguration').name('Delete Selected Config');
  fConfig.close();
  // ----------------------------------------

  // Folder Scene/Camera/Lighting
  const fScene = gui.addFolder('Scene, Camera & Lighting');
  
  // Global Play/Pause button inside Scene folder
  globalPauseController = fScene.add({ toggleGlobalPause: toggleGlobalPause }, 'toggleGlobalPause')
                           .name(isGloballyPaused ? '▶ Global Play' : '⏸ Global Pause');
  
  fScene.addColor(guiParams, 'backgroundColor')
       .name('Background')
       .onChange(v => { if (!guiParams.envMapAsBackground) scene.background = new THREE.Color(v); });
  fScene.add(guiParams, 'cameraMode', ['orbit', 'circular360']).name('Camera Mode');
  fScene.add(guiParams, 'circularSpeed', 0.000001, 0.01, 0.000001).name('Circular Speed');
  fScene.add(guiParams, 'circularRadius', 5, 200, 1).name('Circular Radius');
  fScene.add(guiParams, 'circularHeight', -50, 100, 1).name('Circular Height');
  fScene.add(guiParams, 'cameraFOV', 10, 120, 1).name('Camera FOV')
       .onChange(v => { camera.fov = v; camera.updateProjectionMatrix(); });
  fScene.add(guiParams, 'cameraNear', 0.001, 10, 0.001)
        .name('Camera Near Clip')
        .onChange(value => {
          camera.near = value;
          camera.updateProjectionMatrix();
        });
  fScene.add(guiParams, 'cameraFar', 100, 50000, 100)
        .name('Camera Far Clip')
        .onChange(value => {
          camera.far = value;
          camera.updateProjectionMatrix();
        });
  fScene.add(guiParams, 'showCross').name('Show Cross')
       .onChange(v => { cross.visible = v; });
  fScene.add(guiParams, 'showAxes').name('Show Axes')
       .onChange(v => { axesHelper.visible = v; });
  fScene.add(guiParams, 'antialias').name('Antialias')
       .onChange(() => { recreateRenderer(); });

  // Deselect button
  fScene.add(guiParams, 'deselectAll').name('Deselect Object');

  // === Lighting Subfolder ===
  const lightFolder = fScene.addFolder('Lighting');

  lightFolder.addColor(guiParams, 'ambientColor').name('Ambient Color').onChange(v => ambientLight.color.set(v));
  lightFolder.add(guiParams, 'ambientIntensity', 0, 2).name('Ambient Intensity').onChange(v => ambientLight.intensity = v);
  lightFolder.add(guiParams, 'showLightHelpers').name('Show Helpers').onChange(v => {
      keyLightHelper.visible = v;
      fillLightHelper.visible = v;
      backLightHelper.visible = v;
  });

  // Key Light
  const keyLightFolder = lightFolder.addFolder('Key Light (Red)');
  lightControllers.keyFolder = keyLightFolder; // Store folder reference
  lightControllers.keyColor = keyLightFolder.addColor(guiParams, 'keyLightColor').name('Color').onChange(v => keyLight.color.set(v));
  lightControllers.keyIntensity = keyLightFolder.add(guiParams, 'keyLightIntensity', 0, 5).name('Intensity').onChange(v => keyLight.intensity = v);
  lightPositionControllers.keyX = keyLightFolder.add(guiParams, 'keyLightX', -50, 50).name('Pos X').onChange(v => keyLight.position.x = v);
  lightPositionControllers.keyY = keyLightFolder.add(guiParams, 'keyLightY', -50, 50).name('Pos Y').onChange(v => keyLight.position.y = v);
  lightPositionControllers.keyZ = keyLightFolder.add(guiParams, 'keyLightZ', -50, 50).name('Pos Z').onChange(v => keyLight.position.z = v);
  lightControllers.keyEditBtn = keyLightFolder.add(guiParams, 'editKeyLight').name('Edit Position');
  keyLightFolder.close();
  
  // Fill Light
  const fillLightFolder = lightFolder.addFolder('Fill Light (Green)');
  lightControllers.fillFolder = fillLightFolder; // Store folder reference
  lightControllers.fillColor = fillLightFolder.addColor(guiParams, 'fillLightColor').name('Color').onChange(v => fillLight.color.set(v));
  lightControllers.fillIntensity = fillLightFolder.add(guiParams, 'fillLightIntensity', 0, 5).name('Intensity').onChange(v => fillLight.intensity = v);
  lightPositionControllers.fillX = fillLightFolder.add(guiParams, 'fillLightX', -50, 50).name('Pos X').onChange(v => fillLight.position.x = v);
  lightPositionControllers.fillY = fillLightFolder.add(guiParams, 'fillLightY', -50, 50).name('Pos Y').onChange(v => fillLight.position.y = v);
  lightPositionControllers.fillZ = fillLightFolder.add(guiParams, 'fillLightZ', -50, 50).name('Pos Z').onChange(v => fillLight.position.z = v);
  lightControllers.fillEditBtn = fillLightFolder.add(guiParams, 'editFillLight').name('Edit Position');
  fillLightFolder.close();

  // Back Light
  const backLightFolder = lightFolder.addFolder('Back Light (Blue)');
  lightControllers.backFolder = backLightFolder; // Store folder reference
  lightControllers.backColor = backLightFolder.addColor(guiParams, 'backLightColor').name('Color').onChange(v => backLight.color.set(v));
  lightControllers.backIntensity = backLightFolder.add(guiParams, 'backLightIntensity', 0, 5).name('Intensity').onChange(v => backLight.intensity = v);
  lightPositionControllers.backX = backLightFolder.add(guiParams, 'backLightX', -50, 50).name('Pos X').onChange(v => backLight.position.x = v);
  lightPositionControllers.backY = backLightFolder.add(guiParams, 'backLightY', -50, 50).name('Pos Y').onChange(v => backLight.position.y = v);
  lightPositionControllers.backZ = backLightFolder.add(guiParams, 'backLightZ', -50, 50).name('Pos Z').onChange(v => backLight.position.z = v);
  lightControllers.backEditBtn = backLightFolder.add(guiParams, 'editBackLight').name('Edit Position');
  backLightFolder.close();

  lightFolder.close();

  // Cross subfolder
  const fCross = fScene.addFolder('Cross');
  fCross.add(guiParams, 'crossStep', 0.1, 5, 0.1).name('Arrow Key Step');
  fCross.close();

  fScene.close(); // Close main Scene, Camera & Lighting folder

  // Gaussian Splats Folder (supports PLY, SPLAT, KSPLAT)
  const fPly = gui.addFolder('Gaussian Splats');
  fPly.add(guiParams, 'selectLocalPLY').name('Select File (.ply/.splat/.ksplat)');
  fPly.add(guiParams, 'loadSelectedLocalPLY').name('Load Selected File');
  fPly.add(guiParams, 'plyURL').name('URL (.ply/.splat/.ksplat)');
  fPly.add(guiParams, 'loadPLYFromURL').name('Load from URL');
  fPly.add(guiParams, 'deletePLY').name('Delete Splat');
  
  // --- Add PLY Edit button --- 
  fPly.add(guiParams, 'editPLY').name('Edit PLY (Gizmo)');

  // --- Store PLY transform controllers --- 
  plyTransformControllers.scale = fPly.add(guiParams, 'plyScale', 0.1, 10, 0.1).name('Scale')
       .onChange(applyPLYTransform);
  plyTransformControllers.posX = fPly.add(guiParams, 'plyPosX', -50, 50, 0.1).name('Pos X')
       .onChange(applyPLYTransform);
  plyTransformControllers.posY = fPly.add(guiParams, 'plyPosY', -50, 50, 0.1).name('Pos Y')
       .onChange(applyPLYTransform);
  plyTransformControllers.posZ = fPly.add(guiParams, 'plyPosZ', -50, 50, 0.1).name('Pos Z')
       .onChange(applyPLYTransform);
  plyTransformControllers.rotX = fPly.add(guiParams, 'plyRotationX', 0, 360, 1)
     .name('Rotation X')
     .onChange(applyPLYTransform);
  plyTransformControllers.rotY = fPly.add(guiParams, 'plyRotationY', 0, 360, 1)
     .name('Rotation Y')
     .onChange(applyPLYTransform);
  plyTransformControllers.rotZ = fPly.add(guiParams, 'plyRotationZ', 0, 360, 1)
     .name('Rotation Z')
     .onChange(applyPLYTransform);

  // --- Add Fade-In Toggle ---
  fPly.add(guiParams, 'plyFadeInEffect').name('Fade-In Effect');

  // --- Add Gizmo Mode Controls for PLY --- 
  const fPlyGizmo = fPly.addFolder('Gizmo Controls (PLY)');
  fPlyGizmo.add(guiParams, 'plyTransformMode', ['translate', 'rotate', 'scale']).name('Mode')
      .onChange(v => {
          if (viewer && transformControls.object === viewer) { // Check viewer exists
              transformControls.setMode(v);
          }
      });
  fPlyGizmo.add(guiParams, 'stopEditPLY').name('Stop Editing');
  fPlyGizmo.close();
  // -------------------------------------------
  // Add Animated Delete Button
  fPly.add(guiParams, 'deletePLYAnimated').name('Delete PLY (Animated)');

  fPly.close();

  // === Luma Splats Folder ===
  const fLuma = gui.addFolder('Luma Splats');
  fLuma.add(guiParams, 'lumaURL').name('Luma URL');
  fLuma.add(guiParams, 'loadLumaFromURL').name('Load Luma from URL');
  fLuma.add(guiParams, 'deleteLuma').name('Delete Luma');
  fLuma.add(guiParams, 'editLuma').name('Edit Luma (Gizmo)');

  // Store Luma transform controllers
  lumaTransformControllers.scale = fLuma.add(guiParams, 'lumaScale', 0.1, 10, 0.1).name('Scale')
       .onChange(applyLumaTransform);
  lumaTransformControllers.posX = fLuma.add(guiParams, 'lumaPosX', -50, 50, 0.1).name('Pos X')
       .onChange(applyLumaTransform);
  lumaTransformControllers.posY = fLuma.add(guiParams, 'lumaPosY', -50, 50, 0.1).name('Pos Y')
       .onChange(applyLumaTransform);
  lumaTransformControllers.posZ = fLuma.add(guiParams, 'lumaPosZ', -50, 50, 0.1).name('Pos Z')
       .onChange(applyLumaTransform);
  lumaTransformControllers.rotX = fLuma.add(guiParams, 'lumaRotationX', 0, 360, 1)
     .name('Rotation X')
     .onChange(applyLumaTransform);
  lumaTransformControllers.rotY = fLuma.add(guiParams, 'lumaRotationY', 0, 360, 1)
     .name('Rotation Y')
     .onChange(applyLumaTransform);
  lumaTransformControllers.rotZ = fLuma.add(guiParams, 'lumaRotationZ', 0, 360, 1)
     .name('Rotation Z')
     .onChange(applyLumaTransform);

  // Luma-specific parameters
  const fLumaSettings = fLuma.addFolder('Luma Settings');
  fLumaSettings.add(guiParams, 'lumaParticleRevealEnabled').name('Particle Reveal')
    .onChange(() => { if (lumaSplats) loadNewLuma(guiParams.lumaURL); });
  fLumaSettings.add(guiParams, 'lumaLoadingAnimationEnabled').name('Loading Animation')
    .onChange(() => { if (lumaSplats) loadNewLuma(guiParams.lumaURL); });
  fLumaSettings.add(guiParams, 'lumaThreeShaderIntegration').name('Three.js Integration')
    .onChange(() => { if (lumaSplats) loadNewLuma(guiParams.lumaURL); });
  fLumaSettings.add(guiParams, 'lumaSemanticsMask', ['all', 'foreground', 'background']).name('Semantic Mask')
    .onChange(() => { if (lumaSplats) loadNewLuma(guiParams.lumaURL); });
  fLumaSettings.close();

  // Gizmo Mode Controls for Luma
  const fLumaGizmo = fLuma.addFolder('Gizmo Controls (Luma)');
  fLumaGizmo.add(guiParams, 'lumaTransformMode', ['translate', 'rotate', 'scale']).name('Mode')
      .onChange(v => {
          if (lumaSplats && transformControls.object === lumaSplats) {
              transformControls.setMode(v);
          }
      });
  fLumaGizmo.add(guiParams, 'stopEditLuma').name('Stop Editing');
  fLumaGizmo.close();

  fLuma.close();

  // GLB
  let fGlb; // Make fGlb accessible for dynamic updates
  let glbControllers = {}; // Store controllers for GUI elements of loaded GLBs

  // Add a hidden file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'glbFileInput';
  fileInput.accept = '.glb';
  fileInput.style.display = 'none'; // Hide the actual input
  document.body.appendChild(fileInput); // Add it to the DOM

  // Add a button to trigger the file input
  fGlb = gui.addFolder('GLB'); // Assign to the global fGlb variable
  glbFolderRef = fGlb; // Assign to the global reference
  fGlb.add({ selectFile: () => fileInput.click() }, 'selectFile').name('Select GLB File');

  // Add the load button (will use the file selected via the hidden input)
  fGlb.add(guiParams, 'loadGLB').name('Load Selected GLB');

  // -- CONTROLS FOR SELECTED GLB --
  // Store references to these controllers in glbTransformControllers
  glbTransformControllers.scale = fGlb.add(guiParams, 'glbScale', 0.01, 10, 0.01).name('Scale')
                                     .onChange(updateSelectedGLBProperties);
  glbTransformControllers.posX = fGlb.add(guiParams, 'glbPosX', -50, 50, 0.1).name('Pos X')
                                    .onChange(updateSelectedGLBProperties);
  glbTransformControllers.posY = fGlb.add(guiParams, 'glbPosY', -50, 50, 0.1).name('Pos Y')
                                    .onChange(updateSelectedGLBProperties);
  glbTransformControllers.posZ = fGlb.add(guiParams, 'glbPosZ', -50, 50, 0.1).name('Pos Z')
                                    .onChange(updateSelectedGLBProperties);

  // --- Add Rotation Controls ---
  glbTransformControllers.rotX = fGlb.add(guiParams, 'glbRotX', -180, 180, 1).name('Rot X (deg)')
                                     .onChange(updateSelectedGLBProperties);
  glbTransformControllers.rotY = fGlb.add(guiParams, 'glbRotY', -180, 180, 1).name('Rot Y (deg)')
                                     .onChange(updateSelectedGLBProperties);
  glbTransformControllers.rotZ = fGlb.add(guiParams, 'glbRotZ', -180, 180, 1).name('Rot Z (deg)')
                                     .onChange(updateSelectedGLBProperties);
  // -----------------------------

  // PBR Material controls for selected GLB
  const fGlbPBR = fGlb.addFolder('PBR Material');
  glbTransformControllers.metalness = fGlbPBR.add(guiParams, 'glbMetalness', 0, 1, 0.01).name('Metalness')
                                             .onChange(updateSelectedGLBProperties);
  glbTransformControllers.roughness = fGlbPBR.add(guiParams, 'glbRoughness', 0, 1, 0.01).name('Roughness')
                                             .onChange(updateSelectedGLBProperties);
  fGlbPBR.close();

  // NEW: Emissive controls for selected GLB
  const fGlbEmission = fGlb.addFolder('Emission & Reflections');
  glbTransformControllers.useEmissive = fGlbEmission.add(guiParams, 'glbUseEmissive').name('Use Texture as Emission')
                                              .onChange(updateSelectedGLBProperties);
  glbTransformControllers.emissiveColor = fGlbEmission.addColor(guiParams, 'glbEmissiveColor').name('Emissive Color')
                                              .onChange(updateSelectedGLBProperties);
  glbTransformControllers.emissiveIntensity = fGlbEmission.add(guiParams, 'glbEmissiveIntensity', 0, 10, 0.1).name('Emissive Intensity')
                                              .onChange(updateSelectedGLBProperties);
  glbTransformControllers.envMapIntensity = fGlbEmission.add(guiParams, 'glbEnvMapIntensity', 0, 1, 0.01).name('Reflection Intensity')
                                              .onChange(updateSelectedGLBProperties);
  fGlbEmission.close();

  // Texture controls for selected GLB
  const fGlbTexture = fGlb.addFolder('Texture');
  glbTransformControllers.textureEnabled = fGlbTexture.add(guiParams, 'glbTextureEnabled').name('Enable Texture')
                                                .onChange(updateSelectedGLBProperties); // Update immediately on toggle
  glbTransformControllers.repeatX = fGlbTexture.add(guiParams, 'glbTextureRepeatX', 0.1, 10, 0.1).name('Repeat X')
                                               .onChange(updateSelectedGLBProperties);
  glbTransformControllers.repeatY = fGlbTexture.add(guiParams, 'glbTextureRepeatY', 0.1, 10, 0.1).name('Repeat Y')
                                               .onChange(updateSelectedGLBProperties);
  glbTransformControllers.offsetX = fGlbTexture.add(guiParams, 'glbTextureOffsetX', -1, 1, 0.01).name('Offset X')
                                               .onChange(updateSelectedGLBProperties);
  glbTransformControllers.offsetY = fGlbTexture.add(guiParams, 'glbTextureOffsetY', -1, 1, 0.01).name('Offset Y')
                                               .onChange(updateSelectedGLBProperties);
  fGlbTexture.close();

  // Create a sub-folder for the list of loaded GLBs
  const fLoadedGlbs = fGlb.addFolder('Loaded GLBs');
  loadedGLBsFolderRef = fLoadedGlbs; // Assign to the global reference
  fLoadedGlbs.close();
  // Store reference to this folder to add/remove items - REMOVED, using global ref now
  // fGlb.__loadedGlbsFolder = fLoadedGlbs;

  // --- Add TransformControls GUI ---
  const fGizmo = fGlb.addFolder('Gizmo Controls');
  fGizmo.add(guiParams, 'transformMode', ['translate', 'rotate', 'scale']).name('Mode')
        .onChange(v => transformControls.setMode(v));
  fGizmo.add(guiParams, 'transformSpace', ['world', 'local']).name('Space')
        .onChange(v => transformControls.setSpace(v));
  fGizmo.close();
  // --------------------------------

  fGlb.close();

  // Environment & Rendering
  const fEnv = gui.addFolder('Environment & Rendering');
  fEnv.add(guiParams, 'envMapURL').name('HDR URL');
  fEnv.add(guiParams, 'useEnvMap').name('Use EnvMap')
      .onChange(v => {
          if (v && guiParams.envMapURL) loadEnvironmentMap(guiParams.envMapURL);
          else { scene.environment = null; updateAllMaterialsEnvMap(); }
      });
  fEnv.add(guiParams, 'envMapAsBackground').name('EnvMap as BG')
       .onChange(v => { scene.background = v && scene.environment ? scene.environment : new THREE.Color(guiParams.backgroundColor); });
  fEnv.add(guiParams, 'loadEnvMap').name('Load/Apply HDR');
  // ToneMapping
  fEnv.add(guiParams, 'toneMapping', ['None','ACESFilmic','Reinhard'])
       .name('ToneMapping')
       .onChange(updateToneMapping);
  fEnv.add(guiParams, 'exposure', 0.01, 5, 0.01).name('Exposure')
       .onChange(v => { renderer.toneMappingExposure = v; });
  // Bloom
  fEnv.add(guiParams, 'enableBloom').name('Enable Bloom')
       .onChange(updateBloomParams);
  fEnv.add(guiParams, 'bloomThreshold', 0, 1, 0.01).name('Bloom Threshold')
       .onChange(updateBloomParams);
  fEnv.add(guiParams, 'bloomStrength', 0, 3, 0.1).name('Bloom Strength')
       .onChange(updateBloomParams);
  fEnv.add(guiParams, 'bloomRadius', 0, 2, 0.01).name('Bloom Radius')
       .onChange(updateBloomParams);
  fEnv.close();

  // === LoRA Capture Folder (at the end, with special styling) ===
  const fLoRA = gui.addFolder('🎬 LoRA Capture');
  fLoRA.add(guiParams, 'loraCameraRadius', 1, 20, 0.5).name('Camera Radius');
  fLoRA.add(guiParams, 'loraDistanceVariations').name('Distance Variations (3x)')
       .onChange((value) => {
         console.log(`Distance variations ${value ? 'enabled' : 'disabled'}: ${value ? '72' : '24'} total poses`);
       });
  fLoRA.add(guiParams, 'loraCloseupFactor', 0.3, 0.9, 0.1).name('Close-up Factor');
  fLoRA.add(guiParams, 'loraWideFactor', 1.2, 3.0, 0.1).name('Wide Factor');
  fLoRA.add(guiParams, 'loraElevations').name('Elevations (°)');
  fLoRA.add(guiParams, 'loraAzimuths').name('Azimuths (°)');
  fLoRA.add(guiParams, 'loraCaptureDelay', 100, 1000, 50).name('Delay (ms)');
  fLoRA.add(guiParams, 'loraExportTxt').name('Export .txt Captions');
  loraStatusController = fLoRA.add(guiParams, 'loraCaptureStatus').name('Status').listen();
  loraCapturedCountController = fLoRA.add(guiParams, 'loraCapturedCount').name('Captured').listen();
  fLoRA.add(guiParams, 'startLoraCapture').name('📸 Start Capture');
  fLoRA.add(guiParams, 'downloadLoraDataset').name('💾 Download Dataset');
  
  fLoRA.close();
  
  // Add shimmer animation directly to the folder
  setTimeout(() => {
    const titleEl = fLoRA.domElement.querySelector('.title') || fLoRA.domElement.firstChild;
    if (titleEl) {
      titleEl.style.animation = 'lora-shimmer 3s ease-in-out infinite';
    }
    // Also add to the li element
    fLoRA.domElement.style.animation = 'lora-shimmer 3s ease-in-out infinite';
  }, 200);

}

function updateToneMapping() {
  switch(guiParams.toneMapping) {
    case 'None':
      renderer.toneMapping = THREE.NoToneMapping;
      break;
    case 'ACESFilmic':
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      break;
    case 'Reinhard':
      renderer.toneMapping = THREE.ReinhardToneMapping;
      break;
  }
  renderer.toneMappingExposure = guiParams.exposure;
}

function updateBloomParams() {
  if (bloomPass) { // Ensure bloomPass exists
    bloomPass.threshold = guiParams.bloomThreshold;
    bloomPass.strength = guiParams.bloomStrength;
    bloomPass.radius = guiParams.bloomRadius;
  }
  // Re-setup composer passes based on enableBloom state
  // Dispose previous composer maybe?
  // initPostprocessing(); // Re-initializing might be simpler and safer
  // Or manually manage passes:
  composer.passes = [renderPass]; // Reset passes to just render pass
  if (guiParams.enableBloom && bloomPass) {
      composer.addPass(bloomPass); // Add bloom pass if enabled
  }
}

// Add delete functions
function deletePLY() {
  // Detach gizmo FIRST if it's attached to the viewer being deleted
  if (viewer && transformControls.object === viewer) { // Check if viewer exists
      console.log("Detaching TransformControls from PLY viewer before deletion.");
      transformControls.detach();
  }
  if (viewer) {
    scene.remove(viewer);
    if (typeof viewer.dispose === 'function') {
        viewer.dispose();
    }
    viewer = null; // Set global viewer to null
    console.log('PLY deleted');
  }
  // No Blob URL to revoke anymore
  /*
  if (currentPlyBlobUrl) {
    console.log('Revoking PLY Blob URL on delete.');
    URL.revokeObjectURL(currentPlyBlobUrl);
    currentPlyBlobUrl = null;
  }
  */
}

// Function to add a GLB entry to the GUI
function addGLBToGUI(id, name) {
    // Use the global reference to the 'Loaded GLBs' folder
    if (!loadedGLBsFolderRef) {
        console.error("GUI setup error: loadedGLBsFolderRef is not defined.");
        return;
    }

    const folder = loadedGLBsFolderRef;
    const displayName = `${name.substring(0, 20)}${name.length > 20 ? '...' : ''} (${id})`; // Shorten name

    // Create a container object for this GLB's controls in the GUI list
    const listItem = {
        select: () => selectObject(importedGLBs[id]),
        delete: () => deleteGLB(id)
    };

    // Add controls to the folder, storing references
    const selectController = folder.add(listItem, 'select').name(`Select ${displayName}`);
    const deleteController = folder.add(listItem, 'delete').name(`Delete`); // Keep delete shorter

    // Store controllers associated with this ID so we can remove them
    glbControllers[id] = [selectController, deleteController];
}

// Function to remove a GLB entry from the GUI
function removeGLBFromGUI(id) {
    // Use the global reference
    if (!loadedGLBsFolderRef) return;

    const controllers = glbControllers[id];
    if (controllers) {
        controllers.forEach(controller => {
            try {
                loadedGLBsFolderRef.remove(controller);
            } catch (e) {
                console.warn(`Error removing controller for ${id} from GUI:`, e);
            }
        });
        delete glbControllers[id];
    }
}

// Function to select an object for editing
function selectObject(object) {
    // If the passed object is a helper, select its corresponding light
    if (object.isDirectionalLightHelper) {
        object = object.light;
    }

    if (selectedObject === object) {
        // If the same object is selected again, deselect it
        deselectObject();
    return;
  }

    deselectObject(); // Deselect previous object first

    selectedObject = object;
    transformControls.attach(object);

    updateGUIForSelection(); // Update GUI to reflect the new selection
    console.log('Selected:', selectedObject);
}

// Function to deselect any object
function deselectObject() {
    if (!selectedObject) return;
    
    console.log('Deselected:', selectedObject);
  transformControls.detach();
    selectedObject = null;

    updateGUIForSelection(); // Update GUI to reset panels and buttons
}

// Function to update the GUI based on the current selection
function updateGUIForSelection() {
    // --- Reset all selection-dependent GUI elements first ---
    // Close all object-specific folders
    if (glbFolderRef) glbFolderRef.__folders['PBR Material'].close();
    if (glbFolderRef) glbFolderRef.__folders['Emission & Reflections'].close();
    if (glbFolderRef) glbFolderRef.__folders['Texture'].close();
    if (lightControllers.keyFolder) lightControllers.keyFolder.close();
    if (lightControllers.fillFolder) lightControllers.fillFolder.close();
    if (lightControllers.backFolder) lightControllers.backFolder.close();
    
    // Reset all 'Select' button texts
    for (const id in glbControllers) {
        if (glbControllers[id].selectBtn) {
            glbControllers[id].selectBtn.name(`Select ${glbControllers[id].displayName}`);
        }
    }
    if (lightControllers.keyEditBtn) lightControllers.keyEditBtn.name('Edit Position');
    if (lightControllers.fillEditBtn) lightControllers.fillEditBtn.name('Edit Position');
    if (lightControllers.backEditBtn) lightControllers.backEditBtn.name('Edit Position');
    // TODO: Add resets for PLY edit buttons if they get selection state

    // --- Now, set the GUI for the currently selected object ---
    if (!selectedObject) return;

    const type = selectedObject.userData.type;
    const id = selectedObject.userData.id;
    const name = selectedObject.userData.name;

    switch (type) {
        case 'glb':
            if (importedGLBs[id]) {
                const glb = importedGLBs[id];
                // Update guiParams from the object's current state
                guiParams.glbScale = glb.scale.x;
                guiParams.glbPosX = glb.position.x;
                guiParams.glbPosY = glb.position.y;
                guiParams.glbPosZ = glb.position.z;
                const euler = new THREE.Euler().setFromQuaternion(glb.quaternion, 'XYZ');
                guiParams.glbRotX = THREE.MathUtils.radToDeg(euler.x);
                guiParams.glbRotY = THREE.MathUtils.radToDeg(euler.y);
                guiParams.glbRotZ = THREE.MathUtils.radToDeg(euler.z);

                // Find and update material properties
                let pbrMaterialFound = false;
                glb.traverse(child => {
                    if (!pbrMaterialFound && child.isMesh && child.material?.isMeshStandardMaterial) {
                        const mat = child.material;
                        guiParams.glbMetalness = mat.metalness;
                        guiParams.glbRoughness = mat.roughness;
                        guiParams.glbUseEmissive = (mat.emissiveMap === mat.map && mat.map !== null);
                        guiParams.glbEmissiveColor = `#${mat.emissive.getHexString()}`;
                        guiParams.glbEmissiveIntensity = mat.emissiveIntensity;
                        guiParams.glbEnvMapIntensity = mat.envMapIntensity;
                        pbrMaterialFound = true;
                    }
                });

                // Update all GUI controllers
                for (const key in glbTransformControllers) {
                    if(glbTransformControllers[key]) glbTransformControllers[key].updateDisplay();
                }

                // Open the relevant folders and update button text
                glbFolderRef.__folders['PBR Material'].open();
                glbFolderRef.__folders['Emission & Reflections'].open();
                glbFolderRef.__folders['Texture'].open();
                if (glbControllers[id]?.selectBtn) {
                    glbControllers[id].selectBtn.name('— Selected —');
                }
            }
            break;
        
        case 'light':
            if (name) { // 'key', 'fill', or 'back'
                guiParams[`${name}LightX`] = selectedObject.position.x;
                guiParams[`${name}LightY`] = selectedObject.position.y;
                guiParams[`${name}LightZ`] = selectedObject.position.z;

                lightPositionControllers[`${name}X`].updateDisplay();
                lightPositionControllers[`${name}Y`].updateDisplay();
                lightPositionControllers[`${name}Z`].updateDisplay();

                const folder = lightControllers[`${name}Folder`];
                const button = lightControllers[`${name}EditBtn`];
                if (folder) folder.open();
                if (button) button.name('— Editing —');
            }
            break;
        
        case 'luma':
            if (lumaSplats) {
                // Update guiParams from the object's current state
                guiParams.lumaScale = lumaSplats.scale.x;
                guiParams.lumaPosX = lumaSplats.position.x;
                guiParams.lumaPosY = lumaSplats.position.y;
                guiParams.lumaPosZ = lumaSplats.position.z;
                const euler = new THREE.Euler().setFromQuaternion(lumaSplats.quaternion, 'XYZ');
                guiParams.lumaRotationX = THREE.MathUtils.radToDeg(euler.x);
                guiParams.lumaRotationY = THREE.MathUtils.radToDeg(euler.y);
                guiParams.lumaRotationZ = THREE.MathUtils.radToDeg(euler.z);

                // Update all GUI controllers
                for (const key in lumaTransformControllers) {
                    if (lumaTransformControllers[key]) lumaTransformControllers[key].updateDisplay();
                }

                // No specific folder to open for Luma currently, but could add indication
                console.log('Luma splats selected for editing');
            }
            break;

        // TODO: Add cases for 'ply' to open their respective GUI folders
    }
}

// Function to update GUI parameters and controls from TransformControls changes
function updateGUIFromTransformControls() {
    if (!transformControls.object) return;

    const object = transformControls.object;

    // Update position
    guiParams.glbPosX = object.position.x;
    guiParams.glbPosY = object.position.y;
    guiParams.glbPosZ = object.position.z;
    updateGUIController(glbTransformControllers.posX, guiParams.glbPosX);
    updateGUIController(glbTransformControllers.posY, guiParams.glbPosY);
    updateGUIController(glbTransformControllers.posZ, guiParams.glbPosZ);

    // Update rotation (convert quaternion to Euler degrees)
    const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'XYZ');
    guiParams.glbRotX = THREE.MathUtils.radToDeg(euler.x);
    guiParams.glbRotY = THREE.MathUtils.radToDeg(euler.y);
    guiParams.glbRotZ = THREE.MathUtils.radToDeg(euler.z);
    updateGUIController(glbTransformControllers.rotX, guiParams.glbRotX);
    updateGUIController(glbTransformControllers.rotY, guiParams.glbRotY);
    updateGUIController(glbTransformControllers.rotZ, guiParams.glbRotZ);

    // Update scale (assuming uniform scaling from gizmo for simplicity here)
    // Use object.scale.x, y, or z depending on which axis was potentially scaled non-uniformly by the gizmo
    // If using uniform scale gizmo, x, y, z should be the same.
    guiParams.glbScale = parseFloat(object.scale.x.toFixed(3)); // Use x as reference
    updateGUIController(glbTransformControllers.scale, guiParams.glbScale);

    // Note: Texture settings are not directly modified by TransformControls
}

// Helper function to update all materials when env map changes
function updateAllMaterialsEnvMap() {
    scene.traverse( function ( child ) {
         if ( child.isMesh && child.material ) {
             const materials = Array.isArray(child.material) ? child.material : [child.material];
             materials.forEach(material => {
                if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                     material.envMap = scene.environment;
                     material.needsUpdate = true;
                }
             });
         }
     } );
}

// --- Global Play/Pause --- 
function toggleGlobalPause() {
    isGloballyPaused = !isGloballyPaused;
    console.log(`Global Pause: ${isGloballyPaused}`);

    if (isGloballyPaused) {
        if (globalPauseController) globalPauseController.name('▶ Global Play');
    } else {
        if (globalPauseController) globalPauseController.name('⏸ Global Pause');
    }
}

// Function to attach gizmo to the PLY viewer object
function attachGizmoToPLY() {
    if (!viewer) {
        alert('Please load a PLY scene first.');
        return;
    }

    console.log("Attaching TransformControls to PLY Viewer");

    // Deselect GLB
    if (selectedObject && selectedObject.userData.type === 'glb') {
        selectedObject = null;
        resetGLBControls(); // Should detach
    }

    // Detach explicitly just in case
    transformControls.detach(); 

    // Attach to PLY viewer object
    transformControls.attach(viewer);
    // Set gizmo mode based on current PLY setting
    transformControls.setMode(guiParams.plyTransformMode);
}

// Function to stop editing the PLY viewer
function stopEditPLY() {
    if (viewer && transformControls.object === viewer) { // Check if viewer exists
        console.log("Detaching TransformControls from PLY viewer.");
        transformControls.detach();
    } else {
        console.log("Gizmo not attached to PLY viewer, nothing to stop.");
    }
}

// Function to update PLY GUI from TransformControls changes
function updatePlyGUIFromTransformControls() {
    if (!viewer || !transformControls.object || transformControls.object !== viewer) return; // Add check for viewer existence

    const object = transformControls.object;

    // Update position
    guiParams.plyPosX = parseFloat(object.position.x.toFixed(3));
    guiParams.plyPosY = parseFloat(object.position.y.toFixed(3));
    guiParams.plyPosZ = parseFloat(object.position.z.toFixed(3));
    updateGUIController(plyTransformControllers.posX, guiParams.plyPosX);
    updateGUIController(plyTransformControllers.posY, guiParams.plyPosY);
    updateGUIController(plyTransformControllers.posZ, guiParams.plyPosZ);

    // Update rotation
    const euler = new THREE.Euler().setFromQuaternion(object.quaternion, 'XYZ');
    guiParams.plyRotationX = parseFloat(THREE.MathUtils.radToDeg(euler.x).toFixed(1));
    guiParams.plyRotationY = parseFloat(THREE.MathUtils.radToDeg(euler.y).toFixed(1));
    guiParams.plyRotationZ = parseFloat(THREE.MathUtils.radToDeg(euler.z).toFixed(1));
    updateGUIController(plyTransformControllers.rotX, guiParams.plyRotationX);
    updateGUIController(plyTransformControllers.rotY, guiParams.plyRotationY);
    updateGUIController(plyTransformControllers.rotZ, guiParams.plyRotationZ);

    // Update scale (use absolute value of x for uniform scale parameter)
    guiParams.plyScale = parseFloat(Math.abs(object.scale.x).toFixed(3));
    updateGUIController(plyTransformControllers.scale, guiParams.plyScale);
    // Note: This doesn't enforce the negative scaling used by applyPLYTransform
    // If user moves a GUI slider afterwards, applyPLYTransform will fix it.
}

// Add function to start animated deletion
function deletePLYAnimated() {
    if (!viewer) {
        console.log("Nothing to delete.");
        return;
    }
    if (plyIsAnimatingDeletion) {
        console.log("Deletion animation already in progress.");
        return;
    }
    console.log("Starting PLY deletion animation...");
    plyIsAnimatingDeletion = true;
    // Disable further interaction with gizmo/GUI during animation if desired
    if (transformControls.object === viewer) {
        transformControls.detach();
    }
    // Potentially disable GUI controls for PLY here
}

// --- Configuration Save/Load --- 

// Moved declaration to the top
// const LOCAL_STORAGE_KEY = 'volumetricViewerConfig';

// Old single save/load functions (can be removed or kept for reference)
/*
function saveConfiguration() { ... }
function loadConfiguration() { ... }
*/

// Helper to get configs object from localStorage
function getStoredConfigs() {
    const configsString = localStorage.getItem(CONFIGS_STORAGE_KEY);
    let configs = {};
    if (configsString) {
        try {
            configs = JSON.parse(configsString);
        } catch (e) {
            console.error("Error parsing stored configs:", e);
            // Optionally clear corrupted data
            // localStorage.removeItem(CONFIGS_STORAGE_KEY);
        }
    }
    return configs;
}

// Helper to update the config dropdown GUI
function populateConfigDropdown() {
    const configs = getStoredConfigs();
    const configNames = Object.keys(configs);

    // Use the stored controller reference
    const controller = camAnimControllers.configSelect;
    if (!controller) {
        console.warn("Config select controller not found in GUI.");
        return;
    }

    // Clear existing options
    const selectElement = controller.domElement.querySelector('select');
    if (!selectElement) return;
    while (selectElement.firstChild) {
        selectElement.removeChild(selectElement.firstChild);
    }

    // Add new options
    if (configNames.length > 0) {
        configNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.text = name;
            selectElement.appendChild(option);
        });
        // Set the GUI param to the first available name if current selection is invalid
        if (!configNames.includes(guiParams.selectedConfigName)) {
             guiParams.selectedConfigName = configNames[0];
        }
    } else {
        guiParams.selectedConfigName = ""; // No configs available
        const option = document.createElement('option');
        option.text = "(No saved configs)";
        option.disabled = true;
        selectElement.appendChild(option);
    }
    controller.updateDisplay(); // Refresh the GUI element
}

// NEW function to save with a specific name
function saveConfigurationAs() {
    const name = guiParams.configSaveName.trim();
    if (!name) {
        alert('Please enter a configuration name.');
        return;
    }

    try {
        // Get existing configs
        const configs = getStoredConfigs();
        
        // Create comprehensive scene data
        const sceneData = {
            version: SCENE_DATA_VERSION,
            timestamp: Date.now(),
            guiParams: { ...guiParams }, // Save all GUI parameters
            
            // Save complete scene state
            scene: {
                backgroundColor: guiParams.backgroundColor,
                
                // Camera state
                camera: {
                    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    quaternion: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w },
                    fov: camera.fov,
                    near: camera.near,
                    far: camera.far
                },
                
                // Lights state
                lights: {
                    ambient: {
                        color: ambientLight.color.getHex(),
                        intensity: ambientLight.intensity
                    },
                    key: {
                        color: keyLight.color.getHex(),
                        intensity: keyLight.intensity,
                        position: { x: keyLight.position.x, y: keyLight.position.y, z: keyLight.position.z },
                        castShadow: keyLight.castShadow
                    },
                    fill: {
                        color: fillLight.color.getHex(),
                        intensity: fillLight.intensity,
                        position: { x: fillLight.position.x, y: fillLight.position.y, z: fillLight.position.z }
                    },
                    back: {
                        color: backLight.color.getHex(),
                        intensity: backLight.intensity,
                        position: { x: backLight.position.x, y: backLight.position.y, z: backLight.position.z }
                    }
                },
                
                // PLY state
                ply: viewer ? {
                    url: guiParams.plyURL,
                    position: { x: viewer.position.x, y: viewer.position.y, z: viewer.position.z },
                    rotation: { x: viewer.rotation.x, y: viewer.rotation.y, z: viewer.rotation.z },
                    scale: { x: Math.abs(viewer.scale.x), y: Math.abs(viewer.scale.y), z: Math.abs(viewer.scale.z) }, // Store absolute values
                    fadeInEffect: guiParams.plyFadeInEffect
                } : null,
                
                // Luma Splats state
                luma: lumaSplats ? {
                    url: guiParams.lumaURL,
                    position: { x: lumaSplats.position.x, y: lumaSplats.position.y, z: lumaSplats.position.z },
                    rotation: { x: lumaSplats.rotation.x, y: lumaSplats.rotation.y, z: lumaSplats.rotation.z },
                    scale: { x: lumaSplats.scale.x, y: lumaSplats.scale.y, z: lumaSplats.scale.z },
                    particleRevealEnabled: guiParams.lumaParticleRevealEnabled,
                    semanticsMask: guiParams.lumaSemanticsMask,
                    loadingAnimationEnabled: guiParams.lumaLoadingAnimationEnabled,
                    threeShaderIntegration: guiParams.lumaThreeShaderIntegration
                } : null,
                
                // GLB models state
                glbs: Object.entries(importedGLBs).map(([id, glb]) => {
                    // Extract material properties from the first PBR material found
                    let materialData = {
                        metalness: 0.5,
                        roughness: 0.5,
                        useEmissive: false,
                        emissiveColor: '#000000',
                        emissiveIntensity: 1.0,
                        envMapIntensity: 1.0
                    };
                    
                    let textureData = {
                        enabled: false,
                        repeatX: 1,
                        repeatY: 1,
                        offsetX: 0,
                        offsetY: 0
                    };
                    
                    glb.traverse(child => {
                        if (child.isMesh && child.material?.isMeshStandardMaterial) {
                            const mat = child.material;
                            materialData = {
                                metalness: mat.metalness,
                                roughness: mat.roughness,
                                useEmissive: (mat.emissiveMap === mat.map && mat.map !== null),
                                emissiveColor: `#${mat.emissive.getHexString()}`,
                                emissiveIntensity: mat.emissiveIntensity,
                                envMapIntensity: mat.envMapIntensity
                            };
                            
                            if (mat.map) {
                                textureData = {
                                    enabled: true,
                                    repeatX: mat.map.repeat.x,
                                    repeatY: mat.map.repeat.y,
                                    offsetX: mat.map.offset.x,
                                    offsetY: mat.map.offset.y
                                };
                            }
                            return; // Stop after first material
                        }
                    });
                    
                    return {
                        id: id,
                        fileName: glb.userData.fileName || `glb-${id}`,
                        position: { x: glb.position.x, y: glb.position.y, z: glb.position.z },
                        rotation: { x: glb.rotation.x, y: glb.rotation.y, z: glb.rotation.z },
                        scale: { x: glb.scale.x, y: glb.scale.y, z: glb.scale.z },
                        material: materialData,
                        texture: textureData
                    };
                })
            }
        };
        
        // Store the complete scene data
        configs[name] = sceneData;
        localStorage.setItem(CONFIGS_STORAGE_KEY, JSON.stringify(configs));
        
        // Update dropdown
        populateConfigDropdown();
        guiParams.selectedConfigName = name;
        if (camAnimControllers.configSelect) {
            camAnimControllers.configSelect.updateDisplay();
        }
        
        console.log(`Scene configuration saved: ${name}`);
        alert(`Scene configuration "${name}" saved successfully!`);
        
    } catch (error) {
        console.error('Error saving scene configuration:', error);
        alert('Failed to save scene configuration. Check console for details.');
    }
}

function loadSelectedConfiguration() {
    const configName = guiParams.selectedConfigName;
    if (!configName) {
        alert('Please select a configuration to load.');
        return;
    }

    try {
        const configs = getStoredConfigs();
        const configData = configs[configName];
        
        if (!configData) {
            alert(`Configuration "${configName}" not found.`);
            return;
        }

        console.log(`Loading scene configuration: ${configName}`);
        
        setTimeout(async () => {
            try {
                await loadSceneFromData(configData);
                alert(`Scene configuration "${configName}" loaded successfully!`);
            } catch (error) {
                console.error('Error loading scene configuration:', error);
                alert('Failed to load scene configuration. Check console for details.');
            }
        }, 100); // Small delay to allow UI update
        
    } catch (error) {
        console.error('Error accessing scene configuration:', error);
        alert('Failed to access scene configuration. Check console for details.');
    }
}

async function loadSceneFromData(configData) {
    // Validate data format
    if (!configData.scene) {
        // Legacy format - only GUI params
        if (configData.guiParams) {
            Object.assign(guiParams, configData.guiParams);
            if (window.datGuiInstance) {
                refreshGUIDisplay();
            }
        }
        return;
    }
    
    const sceneData = configData.scene;
    
    // Clear existing scene
    await clearScene();
    
    // Restore GUI parameters first
    if (configData.guiParams) {
        Object.assign(guiParams, configData.guiParams);
    }
    
    // Restore camera
    if (sceneData.camera) {
        camera.position.set(sceneData.camera.position.x, sceneData.camera.position.y, sceneData.camera.position.z);
        camera.quaternion.set(sceneData.camera.quaternion.x, sceneData.camera.quaternion.y, sceneData.camera.quaternion.z, sceneData.camera.quaternion.w);
        camera.fov = sceneData.camera.fov;
        camera.near = sceneData.camera.near;
        camera.far = sceneData.camera.far;
        camera.updateProjectionMatrix();
        controls.update();
    }
    
    // Restore background
    if (sceneData.backgroundColor) {
        scene.background = new THREE.Color(sceneData.backgroundColor);
    }
    
    // Restore lights
    if (sceneData.lights) {
        const lights = sceneData.lights;
        
        if (lights.ambient) {
            ambientLight.color.setHex(lights.ambient.color);
            ambientLight.intensity = lights.ambient.intensity;
            guiParams.ambientColor = `#${lights.ambient.color.toString(16).padStart(6, '0')}`;
            guiParams.ambientIntensity = lights.ambient.intensity;
        }
        
        if (lights.key) {
            keyLight.color.setHex(lights.key.color);
            keyLight.intensity = lights.key.intensity;
            keyLight.position.set(lights.key.position.x, lights.key.position.y, lights.key.position.z);
            keyLight.castShadow = lights.key.castShadow;
            guiParams.keyLightColor = `#${lights.key.color.toString(16).padStart(6, '0')}`;
            guiParams.keyLightIntensity = lights.key.intensity;
            guiParams.keyLightX = lights.key.position.x;
            guiParams.keyLightY = lights.key.position.y;
            guiParams.keyLightZ = lights.key.position.z;
        }
        
        if (lights.fill) {
            fillLight.color.setHex(lights.fill.color);
            fillLight.intensity = lights.fill.intensity;
            fillLight.position.set(lights.fill.position.x, lights.fill.position.y, lights.fill.position.z);
            guiParams.fillLightColor = `#${lights.fill.color.toString(16).padStart(6, '0')}`;
            guiParams.fillLightIntensity = lights.fill.intensity;
            guiParams.fillLightX = lights.fill.position.x;
            guiParams.fillLightY = lights.fill.position.y;
            guiParams.fillLightZ = lights.fill.position.z;
        }
        
        if (lights.back) {
            backLight.color.setHex(lights.back.color);
            backLight.intensity = lights.back.intensity;
            backLight.position.set(lights.back.position.x, lights.back.position.y, lights.back.position.z);
            guiParams.backLightColor = `#${lights.back.color.toString(16).padStart(6, '0')}`;
            guiParams.backLightIntensity = lights.back.intensity;
            guiParams.backLightX = lights.back.position.x;
            guiParams.backLightY = lights.back.position.y;
            guiParams.backLightZ = lights.back.position.z;
        }
    }
    
    // Restore PLY
    if (sceneData.ply) {
        const plyData = sceneData.ply;
        guiParams.plyURL = plyData.url;
        guiParams.plyFadeInEffect = plyData.fadeInEffect;
        
        try {
            await loadNewPLY(plyData.url);
            if (viewer) {
                viewer.position.set(plyData.position.x, plyData.position.y, plyData.position.z);
                viewer.rotation.set(plyData.rotation.x, plyData.rotation.y, plyData.rotation.z);
                const scale = plyData.scale.x;
                viewer.scale.set(-scale, -scale, scale); // Maintain the negative scale pattern
                
                // Update GUI params
                guiParams.plyPosX = plyData.position.x;
                guiParams.plyPosY = plyData.position.y;
                guiParams.plyPosZ = plyData.position.z;
                guiParams.plyRotationX = THREE.MathUtils.radToDeg(plyData.rotation.x);
                guiParams.plyRotationY = THREE.MathUtils.radToDeg(plyData.rotation.y);
                guiParams.plyRotationZ = THREE.MathUtils.radToDeg(plyData.rotation.z);
                guiParams.plyScale = scale;
            }
        } catch (error) {
            console.warn('Failed to load PLY from saved configuration:', error);
        }
    }
    
    // Restore Luma Splats
    if (sceneData.luma) {
        const lumaData = sceneData.luma;
        guiParams.lumaURL = lumaData.url;
        guiParams.lumaParticleRevealEnabled = lumaData.particleRevealEnabled;
        guiParams.lumaSemanticsMask = lumaData.semanticsMask;
        guiParams.lumaLoadingAnimationEnabled = lumaData.loadingAnimationEnabled;
        guiParams.lumaThreeShaderIntegration = lumaData.threeShaderIntegration;
        
        try {
            await loadNewLuma(lumaData.url);
            if (lumaSplats) {
                lumaSplats.position.set(lumaData.position.x, lumaData.position.y, lumaData.position.z);
                lumaSplats.rotation.set(lumaData.rotation.x, lumaData.rotation.y, lumaData.rotation.z);
                lumaSplats.scale.set(lumaData.scale.x, lumaData.scale.y, lumaData.scale.z);
                
                // Update GUI params
                guiParams.lumaPosX = lumaData.position.x;
                guiParams.lumaPosY = lumaData.position.y;
                guiParams.lumaPosZ = lumaData.position.z;
                guiParams.lumaRotationX = THREE.MathUtils.radToDeg(lumaData.rotation.x);
                guiParams.lumaRotationY = THREE.MathUtils.radToDeg(lumaData.rotation.y);
                guiParams.lumaRotationZ = THREE.MathUtils.radToDeg(lumaData.rotation.z);
                guiParams.lumaScale = lumaData.scale.x;
            }
        } catch (error) {
            console.warn('Failed to load Luma from saved configuration:', error);
        }
    }
    
    // Restore GLB models (Note: We can't restore the actual file data, only warn user)
    if (sceneData.glbs && sceneData.glbs.length > 0) {
        console.log('Scene contains GLB models that need to be manually re-imported:');
        sceneData.glbs.forEach(glbData => {
            console.log(`- ${glbData.fileName} (ID: ${glbData.id})`);
        });
        
        // Store GLB data for when models are re-imported
        window.pendingGLBData = sceneData.glbs;
        
        if (sceneData.glbs.length > 0) {
            setTimeout(() => {
                alert(`This scene contains ${sceneData.glbs.length} GLB model(s) that need to be manually re-imported:\n\n${sceneData.glbs.map(g => `• ${g.fileName}`).join('\n')}\n\nTheir positions and materials will be restored automatically when you import them.`);
            }, 1000);
        }
    }
    
    // Refresh GUI display
    if (window.datGuiInstance) {
        refreshGUIDisplay();
    }
}

async function clearScene() {
    // Deselect any selected object
    deselectObject();
    
    // Clear PLY
    deletePLY();
    
    // Clear Luma Splats
    deleteLuma();
    
    // Clear all GLB models
    const glbIds = Object.keys(importedGLBs);
    for (const id of glbIds) {
        deleteGLB(id);
    }
    
    // Reset counters
    glbCounter = 0;
    
    // Clear any pending data
    delete window.pendingGLBData;
}

function refreshGUIDisplay() {
    // Update all GUI controllers to reflect current guiParams
    for (const folder of Object.values(window.datGuiInstance.__folders)) {
        for (const controller of Object.values(folder.__controllers)) {
            if (controller.updateDisplay) {
                controller.updateDisplay();
            }
        }
        // Recursively update subfolders
        for (const subfolder of Object.values(folder.__folders)) {
            for (const controller of Object.values(subfolder.__controllers)) {
                if (controller.updateDisplay) {
                    controller.updateDisplay();
                }
            }
        }
    }
    
    // Update root level controllers
    for (const controller of Object.values(window.datGuiInstance.__controllers)) {
        if (controller.updateDisplay) {
            controller.updateDisplay();
        }
    }
}

function applyPendingGLBData(glbObject, fileName) {
    if (!window.pendingGLBData) return false;
    
    // Find matching GLB data by filename
    const glbData = window.pendingGLBData.find(data => data.fileName === fileName);
    if (!glbData) return false;
    
    // Apply transform
    glbObject.position.set(glbData.position.x, glbData.position.y, glbData.position.z);
    glbObject.rotation.set(glbData.rotation.x, glbData.rotation.y, glbData.rotation.z);
    glbObject.scale.set(glbData.scale.x, glbData.scale.y, glbData.scale.z);
    
    // Apply material properties
    glbObject.traverse(child => {
        if (child.isMesh && child.material?.isMeshStandardMaterial) {
            const mat = child.material;
            const matData = glbData.material;
            
            mat.metalness = matData.metalness;
            mat.roughness = matData.roughness;
            mat.emissive.set(matData.emissiveColor);
            mat.emissiveIntensity = matData.emissiveIntensity;
            mat.envMapIntensity = matData.envMapIntensity;
            
            if (matData.useEmissive && mat.map) {
                mat.emissiveMap = mat.map;
            } else {
                mat.emissiveMap = null;
            }
            
            // Apply texture settings
            if (mat.map && glbData.texture.enabled) {
                mat.map.repeat.set(glbData.texture.repeatX, glbData.texture.repeatY);
                mat.map.offset.set(glbData.texture.offsetX, glbData.texture.offsetY);
                mat.map.needsUpdate = true;
            }
            
            mat.needsUpdate = true;
        }
    });
    
    // Update GUI params if this GLB is currently selected
    if (selectedObject === glbObject) {
        updateGUIForSelection();
    }
    
    // Remove this data from pending list
    const index = window.pendingGLBData.findIndex(data => data.fileName === fileName);
    if (index !== -1) {
        window.pendingGLBData.splice(index, 1);
        if (window.pendingGLBData.length === 0) {
            delete window.pendingGLBData;
        }
    }
    
    console.log(`Applied saved configuration to GLB: ${fileName}`);
    return true;
}

function deleteSelectedConfiguration() {
    const configName = guiParams.selectedConfigName;
    if (!configName || configName.trim() === "") {
        alert("No configuration selected to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to delete configuration '${configName}'?`)) {
        return;
    }

    try {
        const configs = getStoredConfigs();
        if (configs[configName]) {
            delete configs[configName];
            localStorage.setItem(CONFIGS_STORAGE_KEY, JSON.stringify(configs));
            console.log(`Configuration '${configName}' deleted.`);
            alert(`Configuration '${configName}' Deleted!`);
            populateConfigDropdown(); // Refresh dropdown
        } else {
            alert(`Configuration '${configName}' not found for deletion.`);
            populateConfigDropdown(); // Refresh dropdown
        }
    } catch (error) {
        console.error("Error deleting configuration:", error);
        alert('Error deleting configuration. See console for details.');
    }
}


// --- End Configuration Save/Load ---

//////////////////////////////
// deselectAll (NEW)
//////////////////////////////
function deselectAll() {
    deselectObject();
}

//////////////////////////////
// initLighting (NEW)
//////////////////////////////
function initLighting() {
    // Ambient Light
    ambientLight = new THREE.AmbientLight(guiParams.ambientColor, guiParams.ambientIntensity);
    scene.add(ambientLight);

    // Key Light
    keyLight = new THREE.DirectionalLight(guiParams.keyLightColor, guiParams.keyLightIntensity);
    keyLight.position.set(guiParams.keyLightX, guiParams.keyLightY, guiParams.keyLightZ);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048; // Higher resolution for sharper shadows
    keyLight.shadow.mapSize.height = 2048;
    keyLight.userData = { type: 'light', name: 'key' }; // Add metadata
    scene.add(keyLight);
    keyLightHelper = new THREE.DirectionalLightHelper(keyLight, 2, 0xff0000); // Red helper
    keyLightHelper.userData = { type: 'light', name: 'key' }; // Make helper selectable
    scene.add(keyLightHelper);

    // Fill Light
    fillLight = new THREE.DirectionalLight(guiParams.fillLightColor, guiParams.fillLightIntensity);
    fillLight.position.set(guiParams.fillLightX, guiParams.fillLightY, guiParams.fillLightZ);
    fillLight.userData = { type: 'light', name: 'fill' }; // Add metadata
    scene.add(fillLight);
    fillLightHelper = new THREE.DirectionalLightHelper(fillLight, 2, 0x00ff00); // Green helper
    fillLightHelper.userData = { type: 'light', name: 'fill' }; // Make helper selectable
    scene.add(fillLightHelper);

    // Back Light
    backLight = new THREE.DirectionalLight(guiParams.backLightColor, guiParams.backLightIntensity);
    backLight.position.set(guiParams.backLightX, guiParams.backLightY, guiParams.backLightZ);
    backLight.userData = { type: 'light', name: 'back' }; // Add metadata
    scene.add(backLight);
    backLightHelper = new THREE.DirectionalLightHelper(backLight, 2, 0x0000ff); // Blue helper
    backLightHelper.userData = { type: 'light', name: 'back' }; // Make helper selectable
    scene.add(backLightHelper);

    // Set visibility from guiParams
    keyLightHelper.visible = guiParams.showLightHelpers;
    fillLightHelper.visible = guiParams.showLightHelpers;
    backLightHelper.visible = guiParams.showLightHelpers;
}

//////////////////////////////
// updateLightGUIFromTransform (NEW)
//////////////////////////////
function updateLightGUIFromTransform() {
    if (!selectedObject || selectedObject.userData.type !== 'light') return;

    const lightName = selectedObject.userData.name; // 'key', 'fill', or 'back'
    if (!lightName) return;

    // Update the guiParams with the new position from the gizmo
    guiParams[`${lightName}LightX`] = selectedObject.position.x;
    guiParams[`${lightName}LightY`] = selectedObject.position.y;
    guiParams[`${lightName}LightZ`] = selectedObject.position.z;

    // Update the GUI sliders
    updateGUIController(lightPositionControllers[`${lightName}X`], selectedObject.position.x);
    updateGUIController(lightPositionControllers[`${lightName}Y`], selectedObject.position.y);
    updateGUIController(lightPositionControllers[`${lightName}Z`], selectedObject.position.z);
}

// Helper to update dat.GUI controller display safely
function updateGUIController(controller, value) {
    if (controller && typeof controller.setValue === 'function') {
        // Check if the current value is different to avoid unnecessary updates / potential loops
        const currentValue = controller.getValue();
        const tolerance = 0.0001; // Tolerance for float comparison
        // Use tolerance for numbers, strict equality for others (like booleans)
        if (typeof value === 'number' && typeof currentValue === 'number') {
            if (Math.abs(currentValue - value) > tolerance) {
                 controller.setValue(value);
            }
        } else if (currentValue !== value) {
            controller.setValue(value);
        }
    }
}

// Function to reset GLB controls when none is selected
function resetGLBControls() {
    guiParams.glbScale = 1;
    guiParams.glbPosX = 0;
    guiParams.glbPosY = 0;
    guiParams.glbPosZ = 0;
    guiParams.glbTextureEnabled = false;
    guiParams.glbTextureRepeatX = 1;
    guiParams.glbTextureRepeatY = 1;
    guiParams.glbTextureOffsetX = 0;
    guiParams.glbTextureOffsetY = 0;
    guiParams.glbRotX = 0;
    guiParams.glbRotY = 0;
    guiParams.glbRotZ = 0;

    updateGUIController(glbTransformControllers.scale, guiParams.glbScale);
    updateGUIController(glbTransformControllers.posX, guiParams.glbPosX);
    updateGUIController(glbTransformControllers.posY, guiParams.glbPosY);
    updateGUIController(glbTransformControllers.posZ, guiParams.glbPosZ);
    updateGUIController(glbTransformControllers.textureEnabled, guiParams.glbTextureEnabled);
    updateGUIController(glbTransformControllers.repeatX, guiParams.glbTextureRepeatX);
    updateGUIController(glbTransformControllers.repeatY, guiParams.glbTextureRepeatY);
    updateGUIController(glbTransformControllers.offsetX, guiParams.glbTextureOffsetX);
    updateGUIController(glbTransformControllers.offsetY, guiParams.glbTextureOffsetY);
    updateGUIController(glbTransformControllers.rotX, guiParams.glbRotX);
    updateGUIController(glbTransformControllers.rotY, guiParams.glbRotY);
    updateGUIController(glbTransformControllers.rotZ, guiParams.glbRotZ);

    // Detach TransformControls if nothing is selected
    if (transformControls.object && selectedObject === null) { // Check selectedObject too
        transformControls.detach();
    }
    // Optionally disable controls here if desired (e.g., make them non-interactive)
    // You might need a more robust way to enable/disable based on selection
    const controlsActive = selectedObject !== null;
    Object.values(glbTransformControllers).forEach(c => {
        if (c && c.domElement && c.domElement.parentElement) {
            c.domElement.parentElement.style.pointerEvents = controlsActive ? 'auto' : 'none';
            c.domElement.parentElement.style.opacity = controlsActive ? '1' : '0.5';
        }
    });
}

// Function to apply transformations and texture settings to the SELECTED GLB
function updateSelectedGLBProperties() {
    if (!selectedObject || selectedObject.userData.type !== 'glb') return;

    const glb = importedGLBs[selectedObject.userData.id];

    // Apply transform
    applySingleGLBTransform(glb);
    
    // Apply texture and PBR settings
    glb.traverse(child => {
        if (child.isMesh && child.material) {
            const mat = child.material;

            // PBR Properties
            if (mat.isMeshStandardMaterial) {
                mat.metalness = guiParams.glbMetalness;
                mat.roughness = guiParams.glbRoughness;

                // NEW: Emission & Reflection properties
                mat.emissive.set(guiParams.glbEmissiveColor);
                mat.emissiveIntensity = guiParams.glbEmissiveIntensity;
                mat.envMapIntensity = guiParams.glbEnvMapIntensity;

                // Handle emissive map logic
                if (guiParams.glbUseEmissive) {
                    // Use the main texture as the emissive map
                    mat.emissiveMap = mat.map; 
                } else {
                    mat.emissiveMap = null;
                }
    }

            // Texture Properties
    if (guiParams.glbTextureEnabled) {
                // If texture was disabled, try to restore it from cache
                if (!mat.map && mat.userData.originalMap) {
                    mat.map = mat.userData.originalMap;
                    // If we just restored the map, and we want to use it for emission,
                    // we need to set the emissiveMap as well.
                    if (guiParams.glbUseEmissive && mat.isMeshStandardMaterial) {
                        mat.emissiveMap = mat.map;
                    }
                }
                // If there's a texture map, apply transformations
                if (mat.map) {
                    mat.map.repeat.set(guiParams.glbTextureRepeatX, guiParams.glbTextureRepeatY);
                    mat.map.offset.set(guiParams.glbTextureOffsetX, guiParams.glbTextureOffsetY);
                    mat.map.needsUpdate = true;
                    }
            } else {
                // If texture is disabled, cache the current map and set it to null
                if (mat.map) {
                    mat.userData.originalMap = mat.map;
                    mat.map = null;
                    // Also remove emissive map if it was the same texture
                    if (mat.isMeshStandardMaterial) {
                      mat.emissiveMap = null;
                    }
                }
            }
            
            mat.needsUpdate = true;
        }
    });
}
