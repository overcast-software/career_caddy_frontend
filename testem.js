'use strict';

module.exports = {
  test_page: 'tests/index.html?hidepassed',
  disable_watching: true,
  launch_in_ci: ['Chromium'],
  launch_in_dev: ['Chromium'],
  browser_start_timeout: 120,
  browser_args: {
    Chromium: {
      ci: [
        '--no-sandbox',
        '--headless',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=0',
        '--window-size=1440,900',
      ],
    },
  },
};
