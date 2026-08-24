import { marked } from 'marked';
import { saveLocalData, loadLocalData } from '../utils/persistence.js';
import { QUICKSTART_FLAG_KEY } from '../utils/constants.js';

export function setModalVisibility(modalId, isVisible) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.toggle('hidden', !isVisible);
}

export function setToggleActive(toggleId, isActive) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  toggle.classList.toggle('open', isActive);
}

export function closeAllOverlays() {
  const settingsPanel = document.getElementById('settings-panel');
  const settingsToggle = document.getElementById('settings-toggle');
  const dataPanel = document.getElementById('data-panel');
  const dataToggle = document.getElementById('data-toggle');

  if (settingsPanel) settingsPanel.classList.remove('open');
  if (settingsToggle) settingsToggle.classList.remove('open');
  if (dataPanel) dataPanel.classList.remove('open');
  if (dataToggle) dataToggle.classList.remove('open');

  setModalVisibility('about-modal', false);
  setModalVisibility('quickstart-modal', false);
  setToggleActive('about-toggle', false);
  setToggleActive('quickstart-toggle', false);
  setModalVisibility('history-modal', false);
  setToggleActive('history-toggle', false);
  setToggleActive('history-toggle-link', false);
}

export function renderMarkdown(target, markdown) {
  if (!target) return;
  target.innerHTML = marked.parse(markdown);
}

export function openAboutModal() {
  closeAllOverlays();
  setModalVisibility('about-modal', true);
  setToggleActive('about-toggle', true);
}

export function openQuickStartModal() {
  closeAllOverlays();
  setModalVisibility('quickstart-modal', true);
  setToggleActive('quickstart-toggle', true);
}

export function openHistoryModal() {
  const settingsPanel = document.getElementById('settings-panel');
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsPanel) settingsPanel.classList.remove('open');
  if (settingsToggle) settingsToggle.classList.remove('open');

  setModalVisibility('history-modal', true);
}

export async function markQuickStartSeen() {
  await saveLocalData(QUICKSTART_FLAG_KEY, true);
}

export async function maybeShowQuickStartModal() {
  const hasSeenQuickStart = await loadLocalData(QUICKSTART_FLAG_KEY);
  if (hasSeenQuickStart) return;

  requestAnimationFrame(() => {
    openQuickStartModal();
  });

  await markQuickStartSeen();
}

export function showUploadPrompt() {
  const prompt = document.getElementById('upload-prompt');
  if (prompt) prompt.style.display = 'block';
}

export function hideUploadPrompt() {
  const prompt = document.getElementById('upload-prompt');
  if (prompt) prompt.style.display = 'none';
}

export function initPanels(aboutMarkdownContent = '') {
  // Render about content if container exists
  const aboutContentEl = document.getElementById('about-modal-content');
  if (aboutContentEl && aboutMarkdownContent) {
    renderMarkdown(aboutContentEl, aboutMarkdownContent);
  }

  // Settings Toggle
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const dataPanel = document.getElementById('data-panel');
  const dataToggle = document.getElementById('data-toggle');
  const aboutToggle = document.getElementById('about-toggle');
  const quickstartToggle = document.getElementById('quickstart-toggle');

  if (settingsToggle) {
    settingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dataPanel) dataPanel.classList.remove('open');
      if (dataToggle) dataToggle.classList.remove('open');
      if (aboutToggle) aboutToggle.classList.remove('open');
      if (quickstartToggle) quickstartToggle.classList.remove('open');
      setModalVisibility('about-modal', false);
      setModalVisibility('quickstart-modal', false);

      if (settingsPanel) settingsPanel.classList.toggle('open');
      settingsToggle.classList.toggle('open');
    });
  }

  // Data Toggle
  if (dataToggle) {
    dataToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (settingsPanel) settingsPanel.classList.remove('open');
      if (settingsToggle) settingsToggle.classList.remove('open');
      if (aboutToggle) aboutToggle.classList.remove('open');
      if (quickstartToggle) quickstartToggle.classList.remove('open');
      setModalVisibility('about-modal', false);
      setModalVisibility('quickstart-modal', false);

      if (dataPanel) dataPanel.classList.toggle('open');
      dataToggle.classList.toggle('open');
    });
  }

  // About Toggle
  if (aboutToggle) {
    aboutToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const aboutModal = document.getElementById('about-modal');
      const shouldOpen = aboutModal ? aboutModal.classList.contains('hidden') : false;
      if (shouldOpen) {
        openAboutModal();
      } else {
        setModalVisibility('about-modal', false);
        setToggleActive('about-toggle', false);
      }
    });
  }

  // Quick Start Toggle
  if (quickstartToggle) {
    quickstartToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const quickstartModal = document.getElementById('quickstart-modal');
      const shouldOpen = quickstartModal ? quickstartModal.classList.contains('hidden') : false;
      if (shouldOpen) {
        openQuickStartModal();
      } else {
        setModalVisibility('quickstart-modal', false);
        setToggleActive('quickstart-toggle', false);
      }
    });
  }

  // History Toggles
  const historyToggle = document.getElementById('history-toggle');
  if (historyToggle) {
    historyToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const historyModal = document.getElementById('history-modal');
      const shouldOpen = historyModal ? historyModal.classList.contains('hidden') : false;
      if (shouldOpen) {
        setToggleActive('history-toggle', true);
        openHistoryModal();
      } else {
        setModalVisibility('history-modal', false);
        setToggleActive('history-toggle', false);
      }
    });
  }

  const historyToggleLink = document.getElementById('history-toggle-link');
  if (historyToggleLink) {
    historyToggleLink.addEventListener('click', (e) => {
      e.stopPropagation();
      const historyModal = document.getElementById('history-modal');
      const shouldOpen = historyModal ? historyModal.classList.contains('hidden') : false;
      if (shouldOpen) {
        setToggleActive('history-toggle-link', true);
        openHistoryModal();
      } else {
        setModalVisibility('history-modal', false);
        setToggleActive('history-toggle-link', false);
      }
    });
  }

  // Click Outside To Close Modals
  document.addEventListener('click', (e) => {
    const aboutModal = document.getElementById('about-modal');
    const isAboutModalOpen = aboutModal && !aboutModal.classList.contains('hidden');
    const clickedAboutOutside = aboutModal && !aboutModal.contains(e.target);
    const clickedAboutToggle = aboutToggle && (aboutToggle === e.target || aboutToggle.contains(e.target));

    const quickstartModal = document.getElementById('quickstart-modal');
    const isQuickStartModalOpen = quickstartModal && !quickstartModal.classList.contains('hidden');
    const clickedQuickStartOutside = quickstartModal && !quickstartModal.contains(e.target);
    const clickedQuickStartToggle = quickstartToggle && (quickstartToggle === e.target || quickstartToggle.contains(e.target));

    const historyModal = document.getElementById('history-modal');
    const isHistoryModalOpen = historyModal && !historyModal.classList.contains('hidden');
    const clickedHistoryOutside = historyModal && !historyModal.contains(e.target);
    const clickedHistoryToggle = historyToggle && (historyToggle === e.target || historyToggle.contains(e.target));
    const clickedHistoryToggleLink = historyToggleLink && (historyToggleLink === e.target || historyToggleLink.contains(e.target));

    if (isAboutModalOpen && clickedAboutOutside && !clickedAboutToggle) {
      setModalVisibility('about-modal', false);
      setToggleActive('about-toggle', false);
    }
    if (isQuickStartModalOpen && clickedQuickStartOutside && !clickedQuickStartToggle) {
      setModalVisibility('quickstart-modal', false);
      setToggleActive('quickstart-toggle', false);
    }
    if (isHistoryModalOpen && clickedHistoryOutside && !clickedHistoryToggle && !clickedHistoryToggleLink) {
      setModalVisibility('history-modal', false);
      setToggleActive('history-toggle', false);
      setToggleActive('history-toggle-link', false);
    }
  });

  // Fullscreen Button
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }
}
