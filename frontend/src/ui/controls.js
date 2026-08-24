import { debounce } from '../utils/helpers.js';
import { saveUISettings } from '../utils/persistence.js';

export function readSettingsFromDOM() {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };

  const getChecked = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.checked : fallback;
  };

  return {
    max_items: getVal('val-limit', '1500'),
    n_neighbors: getVal('val-neighbors', '15'),
    min_dist: getVal('val-dist', '0.3'),
    seed: getVal('val-seed', '-1'),
    eps: getVal('val-eps', '0.3'),
    min_samples: getVal('val-samples', '3'),
    size: getVal('val-size', '10'),
    intensity: getVal('val-intensity', '1.5'),
    opacity: getVal('val-opacity', '1.0'),
    spread: getVal('val-spread', '2.0'),
    autoRotate: getChecked('toggle-sleep-rotate', true)
  };
}

export function writeSettingsToDOM(settings) {
  if (!settings) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setVal('val-limit', settings.max_items);
  setVal('val-neighbors', settings.n_neighbors);
  setVal('val-dist', settings.min_dist);
  setVal('val-seed', settings.seed);
  setVal('val-eps', settings.eps);
  setVal('val-samples', settings.min_samples);
  setVal('val-size', settings.size);
  setVal('val-intensity', settings.intensity);
  setVal('val-opacity', settings.opacity);
  setVal('val-spread', settings.spread);

  const rotateEl = document.getElementById('toggle-sleep-rotate');
  if (rotateEl && settings.autoRotate !== undefined) {
    rotateEl.checked = Boolean(settings.autoRotate);
  }
}

export function refreshAllTooltips() {
  const inputIds = [
    'val-limit',
    'val-neighbors',
    'val-dist',
    'val-seed',
    'val-eps',
    'val-samples',
    'val-size',
    'val-intensity',
    'val-opacity',
    'val-spread'
  ];

  inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.dispatchEvent(new Event('input'));
    }
  });
}

function initSliderTooltips() {
  const sliderWrappers = document.querySelectorAll('.slider-wrapper');

  sliderWrappers.forEach((wrapper) => {
    const slider = wrapper.querySelector('input[type="range"]');
    const tooltip = wrapper.querySelector('.slider-tooltip');
    if (!slider || !tooltip) return;

    const updateTooltip = () => {
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value) || 0;

      tooltip.innerText = slider.value;

      const percent = (val - min) / (max - min);
      const thumbWidth = 12;
      const offset = (0.5 - percent) * thumbWidth;

      tooltip.style.left = `calc(${percent * 100}% + ${offset}px)`;
    };

    slider.addEventListener('input', updateTooltip);
    updateTooltip();
  });
}

export function setUploadState(isUploading, message = '') {
  const btn = document.getElementById('btn-recalculate');
  const emptyStateLabel = document.querySelector('label[for="file-upload"]');
  const emptyStateInput = document.getElementById('file-upload');
  const sidePanelLabel = document.querySelector('label[for="data-panel-upload"]');
  const sidePanelInput = document.getElementById('data-panel-upload');

  if (isUploading) {
    if (btn) btn.disabled = true;
    if (emptyStateLabel) {
      emptyStateLabel.textContent = message || 'Extracting Embeddings...';
      emptyStateLabel.classList.add('disabled');
    }
    if (emptyStateInput) emptyStateInput.disabled = true;
    if (sidePanelLabel) {
      sidePanelLabel.textContent = message || 'Extracting Embeddings...';
      sidePanelLabel.classList.add('disabled');
    }
    if (sidePanelInput) sidePanelInput.disabled = true;
  } else {
    if (btn) btn.disabled = false;
    if (emptyStateLabel) {
      emptyStateLabel.textContent = 'Select Data File';
      emptyStateLabel.classList.remove('disabled');
    }
    if (emptyStateInput) {
      emptyStateInput.disabled = false;
      emptyStateInput.value = '';
    }
    if (sidePanelLabel) {
      sidePanelLabel.textContent = message || 'Upload New History';
      sidePanelLabel.classList.remove('disabled');
    }
    if (sidePanelInput) {
      sidePanelInput.disabled = false;
      sidePanelInput.value = '';
    }
  }
}

export function initControls(callbacks = {}) {
  initSliderTooltips();

  const handleSettingPersist = () => {
    saveUISettings(readSettingsFromDOM());
  };

  // 1. Inputs with persistence only
  ['val-limit', 'val-neighbors', 'val-dist', 'val-seed'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', handleSettingPersist);
    }
  });

  // 2. Real-time Visual Settings
  const sizeInput = document.getElementById('val-size');
  if (sizeInput) {
    sizeInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (callbacks.onSizeChange) callbacks.onSizeChange(val);
      handleSettingPersist();
    });
  }

  const intensityInput = document.getElementById('val-intensity');
  if (intensityInput) {
    intensityInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (callbacks.onIntensityChange) callbacks.onIntensityChange(val);
      handleSettingPersist();
    });
  }

  const opacityInput = document.getElementById('val-opacity');
  if (opacityInput) {
    opacityInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (callbacks.onOpacityChange) callbacks.onOpacityChange(val);
      handleSettingPersist();
    });
  }

  const spreadInput = document.getElementById('val-spread');
  if (spreadInput) {
    spreadInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (callbacks.onSpreadChange) callbacks.onSpreadChange(val);
      handleSettingPersist();
    });
  }

  // 3. Cluster Settings (Debounced API Live Recolor)
  const debouncedRecluster = debounce(() => {
    if (callbacks.onRecluster) callbacks.onRecluster();
  }, 150);

  ['val-eps', 'val-samples'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        debouncedRecluster();
        handleSettingPersist();
      });
    }
  });

  // 4. Auto-rotate Checkbox
  const rotateCheckbox = document.getElementById('toggle-sleep-rotate');
  if (rotateCheckbox) {
    rotateCheckbox.addEventListener('change', (e) => {
      if (callbacks.onAutoRotateChange) callbacks.onAutoRotateChange(e.target.checked);
      handleSettingPersist();
    });
  }

  // 5. File Upload Listeners
  const fileUpload = document.getElementById('file-upload');
  if (fileUpload) {
    fileUpload.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0] && callbacks.onFileUpload) {
        callbacks.onFileUpload(e.target.files[0]);
      }
    });
  }

  const dataPanelUpload = document.getElementById('data-panel-upload');
  if (dataPanelUpload) {
    dataPanelUpload.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0] && callbacks.onFileUpload) {
        callbacks.onFileUpload(e.target.files[0]);
      }
    });
  }

  // 6. Action Buttons
  const recalcBtn = document.getElementById('btn-recalculate');
  if (recalcBtn) {
    recalcBtn.addEventListener('click', () => {
      if (callbacks.onRecalculate) callbacks.onRecalculate();
    });
  }

  const clearBtn = document.getElementById('btn-clear-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const confirmWipe = confirm('This will permanently delete your saved 3D map and reset the app. Continue?');
      if (confirmWipe && callbacks.onClearData) {
        callbacks.onClearData();
      }
    });
  }
}
