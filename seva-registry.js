/**
 * Seva Registry — Plugin system for Siddhanath Kriya Yoga
 * Each seva-X project registers itself here.
 * Core app uses this to build nav and render modules.
 */

window.SevaRegistry = {
  _modules: {},
  _order: [],

  /**
   * Register a seva module.
   * @param {string} id - Unique module ID (e.g. 'sayings', 'sangha')
   * @param {object} config
   * @param {string} config.name - Display name
   * @param {string} config.emoji - Nav emoji
   * @param {function} config.render - Returns HTML string for the section
   * @param {function} [config.init] - Called after render (wire up listeners)
   * @param {function} [config.destroy] - Called before switching away
   * @param {number} [config.order] - Sort order (lower = first)
   */
  register(id, config) {
    this._modules[id] = config;
    this._order.push({ id, order: config.order || 99 });
    this._order.sort((a, b) => a.order - b.order);
    console.log(`[Seva] Registered: ${config.emoji} ${config.name}`);
  },

  getAll() {
    return this._order.map(o => ({ id: o.id, ...this._modules[o.id] }));
  },

  get(id) {
    return this._modules[id] || null;
  },

  has(id) {
    return id in this._modules;
  }
};
