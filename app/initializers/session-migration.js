export function initialize() {
  // Clean up legacy localStorage keys from custom session implementation
  localStorage.removeItem('cc:jwt:access');
  localStorage.removeItem('cc:jwt:refresh');
}

export default {
  name: 'session-migration',
  initialize
};
