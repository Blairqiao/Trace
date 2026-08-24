export function updateGalaxyInfoPill(nodes = [], fidelity = null, isDemoMode = false) {
  const pill = document.getElementById('galaxy-info-pill');
  if (!pill) return;

  if (isDemoMode || !nodes || nodes.length === 0) {
    pill.classList.add('hidden');
    return;
  }

  const nodesValEl = document.getElementById('pill-nodes-val');
  const clustersValEl = document.getElementById('pill-clusters-val');
  const fidelityValEl = document.getElementById('pill-fidelity-val');

  if (nodesValEl) {
    nodesValEl.textContent = nodes.length.toLocaleString();
  }

  if (clustersValEl) {
    const clusterIds = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const c = nodes[i].cluster;
      if (c !== undefined && c !== null && c >= 0) {
        clusterIds.add(c);
      }
    }
    clustersValEl.textContent = clusterIds.size.toLocaleString();
  }

  if (fidelityValEl) {
    if (fidelity !== null && fidelity !== undefined && !isNaN(Number(fidelity))) {
      fidelityValEl.textContent = `${Number(fidelity).toFixed(1)}%`;
    } else {
      fidelityValEl.textContent = '--%';
    }
  }

  pill.classList.remove('hidden');
}

export function hideGalaxyInfoPill() {
  const pill = document.getElementById('galaxy-info-pill');
  if (pill) {
    pill.classList.add('hidden');
  }
}

export function updateDataPanelUI(fileName) {
  const statusText = document.getElementById('current-file-name');
  const statusDot = document.querySelector('.status-dot');

  if (!statusText || !statusDot) return;

  if (fileName) {
    statusText.innerText = `Active: ${fileName}`;
    statusDot.classList.add('active');
  } else {
    statusText.innerText = 'No data loaded';
    statusDot.classList.remove('active');
  }
}
