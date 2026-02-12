/**
 * Seva (selfless service) types available at the ashram.
 * Each type has a unique ID, emoji icon, and display name.
 * @module seva-types
 */

const SEVA_TYPES = [
  { id: 'bhojan',      emoji: '🍽️', name: 'Dining (Bhojan Seva)' },
  { id: 'saucha',      emoji: '🧹', name: 'Cleaning (Saucha Seva)' },
  { id: 'garden',      emoji: '🌱', name: 'Garden Seva' },
  { id: 'puja',        emoji: '🪔', name: 'Temple / Altar (Puja Seva)' },
  { id: 'reception',   emoji: '🙏', name: 'Welcome (Reception Seva)' },
  { id: 'laundry',     emoji: '👕', name: 'Laundry Seva' },
  { id: 'maintenance', emoji: '🔧', name: 'Maintenance Seva' },
  { id: 'gurubhai',    emoji: '📖', name: 'Teaching (Gurubhai Seva)' },
  { id: 'admin',       emoji: '📋', name: 'Admin Seva' },
  { id: 'rakhwali',    emoji: '🌙', name: 'Night Watch (Rakhwali Seva)' }
];

module.exports = SEVA_TYPES;
