// Military campaigns (domain "campaigns"). Everything of this feature lives in this folder. The page loads this file only when
// "campaigns" is in AHM_CONFIG.features (app/js/features.js). Keep it one function scope: no top-level names, no globals.
(() => {
  AHM.features.register('campaigns', () => {
    // Scaffold: a badge that shows the feature is switched on. Replace it with the real feature.
    const badge = document.createElement('div');
    badge.className = 'campaigns-badge';
    badge.textContent = 'Campaigns (development)';
    document.body.appendChild(badge);
    AHM.features.onMapReady(() => {
      // Draw campaigns here once the map extension points exist (proposals/002-map-extension-points.md).
    });
  });
})();
