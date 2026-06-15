/**
 * Echo — Dynamic Maps Frame
 * -----------------------------------------------------------------------
 * A Leaflet map (OpenStreetMap tiles, no API key required) styled to sit
 * inside a liquid-glass panel. Exposes `updateLocation()` so the agent
 * pipeline can push new geo-context — e.g. when OpenJarvis reports it
 * geocoded an address, or is tracking a local operation with a physical
 * location component.
 *
 * Leaflet is loaded from the CDN in index.html. If it fails to load
 * (fully offline environments), this component degrades to a static
 * placeholder card instead of throwing.
 */

const DEFAULT_VIEW = { lat: 37.4275, lng: -122.1697, label: 'Stanford, CA — OpenJarvis origin', zoom: 12 };

export class MapsFrame {
  constructor(root) {
    this.root = root;
    this.mapEl = root.querySelector('[data-map="canvas"]');
    this.labelEl = root.querySelector('[data-map="label"]');
    this.coordsEl = root.querySelector('[data-map="coords"]');
    this.map = null;
    this.marker = null;
    this._init();
  }

  _init() {
    if (typeof window.L === 'undefined') {
      this.root.classList.add('map-unavailable');
      this.labelEl.textContent = 'Map tiles unavailable offline';
      return;
    }

    this.map = window.L.map(this.mapEl, {
      zoomControl: true,
      attributionControl: true,
    }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = window.L.circleMarker([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], {
      radius: 8,
      color: '#a855f7',
      fillColor: '#3b82f6',
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(this.map);

    this.updateLocation(DEFAULT_VIEW.lat, DEFAULT_VIEW.lng, DEFAULT_VIEW.label);

    // Leaflet needs an explicit size recalculation once its container is
    // visible and has a final layout size (it's inside a flex/grid panel).
    requestAnimationFrame(() => this.map.invalidateSize());
    window.addEventListener('resize', () => this.map?.invalidateSize());
  }

  /**
   * Pushes a new focus point onto the map. Called from main.js when the
   * agent stream indicates a location-aware action (geocoding,
   * navigation, "where am I" queries, etc.).
   */
  updateLocation(lat, lng, label) {
    if (!this.map) return;
    this.map.setView([lat, lng], this.map.getZoom());
    this.marker.setLatLng([lat, lng]);
    this.labelEl.textContent = label || 'Location update';
    this.coordsEl.textContent = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
}
