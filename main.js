/**
 * Main Application Coordinator - Oracle Red Bull Racing Portfolio
 * Handles page transitions, scroll interactions, Web Audio F1 synthesizer,
 * HUD telemetry, ambient background canvas, and project taskbar filters.
 */

// Global State
window.currentPageIndex = 1;
window.soundFX = null;

// ========================================================
// 1. F1 AUDIO SYNTHESIZER (Web Audio API)
// ========================================================
class F1SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.isEnabled = false;
    this.engineOsc = null;
    this.engineGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.isEnabled = true;
  }

  toggle() {
    if (!this.ctx) {
      this.init();
      return true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
      this.isEnabled = true;
      return true;
    } else if (this.isEnabled) {
      this.isEnabled = false;
      return false;
    } else {
      this.isEnabled = true;
      return true;
    }
  }

  playRev(intensity = 0.5) {
    if (!this.isEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // V6 Turbo Hybrid Fundamental
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140 + intensity * 80, now);
      osc.frequency.exponentialRampToValueAtTime(320 + intensity * 280, now + 0.45);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      // Lowpass filter for deep exhaust rumble
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  playShift() {
    if (!this.isEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Pneumatic gear shift clack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Audio shift error', e);
    }
  }

  playRadioBeep() {
    if (!this.isEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio radio error', e);
    }
  }
}

window.soundFX = new F1SoundSynthesizer();

// ========================================================
// 2. PAGE NAVIGATION COORDINATOR
// ========================================================
window.navigateToPage = function (targetPage) {
  if (targetPage < 1 || targetPage > 3 || targetPage === window.currentPageIndex) return;

  const previousPage = window.currentPageIndex;
  window.currentPageIndex = targetPage;

  // Update Section Visibility
  document.querySelectorAll('.page-section').forEach((sec) => {
    const idx = parseInt(sec.getAttribute('data-index'), 10);
    sec.classList.remove('active');
    if (idx === targetPage) {
      sec.classList.add('active');
      sec.scrollTop = 0;
    }
  });

  // Update Nav Lap Indicators
  document.querySelectorAll('.lap-step').forEach((step) => {
    const p = parseInt(step.getAttribute('data-page'), 10);
    step.classList.toggle('active', p === targetPage);
  });

  // Update HUD Gear & Speed
  const gearEl = document.getElementById('hud-gear');
  const speedEl = document.getElementById('hud-speed');
  if (gearEl && speedEl) {
    if (targetPage === 1) {
      gearEl.textContent = '1';
      speedEl.innerHTML = '120 <small>KM/H</small>';
    } else if (targetPage === 2) {
      gearEl.textContent = '5';
      speedEl.innerHTML = '285 <small>KM/H</small>';
    } else if (targetPage === 3) {
      gearEl.textContent = '8';
      speedEl.innerHTML = '352 <small>KM/H</small>';
    }
  }

  // Play audio cues
  if (window.soundFX) {
    window.soundFX.playShift();
    window.soundFX.playRadioBeep();
  }
};

// ========================================================
// 3. CURSOR & SCROLL EVENT HANDLING
// ========================================================
function setupCursorAndScroll() {
  const cursor = document.getElementById('f1-cursor');
  const cursorDot = document.getElementById('f1-cursor-dot');

  // Mouse tracking
  window.addEventListener('mousemove', (e) => {
    if (cursor && cursorDot) {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      cursorDot.style.left = `${e.clientX}px`;
      cursorDot.style.top = `${e.clientY}px`;
    }
  });

  // Hover states for interactive elements
  const interactives = document.querySelectorAll('button, a, .spec-card, .wheel-housing, .timing-row, .project-dock-card, .lap-step, .f1-input');
  interactives.forEach((el) => {
    el.addEventListener('mouseenter', () => cursor && cursor.classList.add('active'));
    el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('active'));
  });

  // Wheel scroll interaction
  let isScrollThrottled = false;

  window.addEventListener('wheel', (e) => {
    // If on Page 1, scrolling down rotates the wheel anti-clockwise and moves to Page 2
    if (window.currentPageIndex === 1) {
      if (e.deltaY > 0 && window.ferrariWheel) {
        window.ferrariWheel.rotateByDelta(e.deltaY);
      }
      return;
    }

    // On Page 2 & 3, allow throttle scroll between pages
    if (isScrollThrottled) return;

    if (e.deltaY > 50) {
      // Scroll down
      if (window.currentPageIndex === 2) {
        isScrollThrottled = true;
        if (window.rb22Viewer) {
          window.rb22Viewer.triggerTransitionToStats();
        } else {
          window.navigateToPage(3);
        }
        setTimeout(() => { isScrollThrottled = false; }, 900);
      }
    } else if (e.deltaY < -50) {
      // Scroll up
      if (window.currentPageIndex === 3) {
        const sec3 = document.getElementById('page-3');
        if (sec3 && sec3.scrollTop <= 5) {
          isScrollThrottled = true;
          window.navigateToPage(2);
          setTimeout(() => { isScrollThrottled = false; }, 900);
        }
      } else if (window.currentPageIndex === 2) {
        const sec2 = document.getElementById('page-2');
        if (sec2 && sec2.scrollTop <= 5) {
          isScrollThrottled = true;
          window.navigateToPage(1);
          setTimeout(() => { isScrollThrottled = false; }, 900);
        }
      }
    }
  }, { passive: true });

  // Keyboard navigation (Arrow keys / 1, 2, 3)
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) {
      if (window.currentPageIndex < 3) window.navigateToPage(window.currentPageIndex + 1);
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
      if (window.currentPageIndex > 1) window.navigateToPage(window.currentPageIndex - 1);
    } else if (e.key === '1') {
      window.navigateToPage(1);
    } else if (e.key === '2') {
      window.navigateToPage(2);
    } else if (e.key === '3') {
      window.navigateToPage(3);
    }
  });

  // Lap navigation clicks
  document.querySelectorAll('.lap-step').forEach((step) => {
    step.addEventListener('click', () => {
      const p = parseInt(step.getAttribute('data-page'), 10);
      window.navigateToPage(p);
    });
  });
}

// ========================================================
// 4. TOP HUD TELEMETRY ANIMATIONS
// ========================================================
window.updateHudRpm = function (progress) {
  const leds = document.querySelectorAll('#rpm-lights-cluster .rpm-led');
  const count = Math.floor(progress * leds.length);

  leds.forEach((led, i) => {
    if (i < count) {
      led.classList.add('lit');
    } else {
      led.classList.remove('lit');
    }
  });
};

function setupAudioToggle() {
  const audioBtn = document.getElementById('audio-toggle');
  const audioIcon = document.getElementById('audio-icon');

  if (audioBtn && audioIcon) {
    audioBtn.addEventListener('click', () => {
      const active = window.soundFX.toggle();
      audioBtn.classList.toggle('active', active);
      if (active) {
        audioIcon.className = 'fa-solid fa-volume-high';
        window.soundFX.playRadioBeep();
      } else {
        audioIcon.className = 'fa-solid fa-volume-xmark';
      }
    });
  }
}

// ========================================================
// 5. CONNECT TAB & FORM HANDLING
// ========================================================
function setupConnectTab() {
  const trigger = document.getElementById('connect-tab-toggle');
  const content = document.getElementById('connect-content');

  if (trigger && content) {
    trigger.addEventListener('click', () => {
      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      trigger.classList.toggle('open', isHidden);
      if (window.soundFX) window.soundFX.playRadioBeep();
    });
  }
}

window.submitTelemetryMessage = function () {
  const nameInput = document.getElementById('comms-name');
  const emailInput = document.getElementById('comms-email');
  const messageInput = document.getElementById('comms-message');
  const feedback = document.getElementById('form-feedback');
  const transmitBtn = document.getElementById('transmit-btn');

  if (!nameInput || !emailInput || !messageInput || !feedback) return;

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const msg = messageInput.value.trim();

  if (!name || !email || !msg) {
    feedback.textContent = 'ERROR: FILL ALL TELEMETRY CHANNELS';
    feedback.style.color = 'var(--rb-red)';
    return;
  }

  // Visual transmitting feedback
  if (transmitBtn) {
    transmitBtn.disabled = true;
    transmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRANSMITTING TO PIT WALL...';
  }

  if (window.soundFX) {
    window.soundFX.playRadioBeep();
  }

  setTimeout(() => {
    feedback.textContent = `✓ TRANSMISSION CONFIRMED! STANDBY FOR DRIVER ${name.toUpperCase()} RESPONSE`;
    feedback.style.color = '#00ff66';

    if (transmitBtn) {
      transmitBtn.disabled = false;
      transmitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> TRANSMITTED';
    }

    nameInput.value = '';
    emailInput.value = '';
    messageInput.value = '';

    setTimeout(() => {
      feedback.textContent = '';
      if (transmitBtn) {
        transmitBtn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> TRANSMIT TO PIT WALL';
      }
    }, 5000);
  }, 1200);
};

// ========================================================
// 6. CURRENT PROJECTS TASKBAR FILTERS & MODAL
// ========================================================
function setupProjectTaskbar() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-dock-card');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach((card) => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });

      if (window.soundFX) window.soundFX.playRadioBeep();
    });
  });
}

window.viewProjectDetails = function (title, stack, description, githubUrl) {
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalStack = document.getElementById('modal-stack');
  const modalDesc = document.getElementById('modal-description');

  if (modal && modalTitle && modalStack && modalDesc) {
    modalTitle.textContent = title;
    modalStack.textContent = stack;
    modalDesc.textContent = description;
    modal.classList.add('open');

    if (window.soundFX) window.soundFX.playRadioBeep();
  }
};

window.closeProjectModal = function () {
  const modal = document.getElementById('project-modal');
  if (modal) modal.classList.remove('open');
};

// ========================================================
// 7. SOLID BACKGROUND COLOR CONTROLLER
// ========================================================
function setupSolidBackgroundSwitcher() {
  const swatches = document.querySelectorAll('.color-swatch');
  const savedColor = localStorage.getItem('f1_solid_bg') || '#060814';

  // Apply initial solid color
  applySolidBackgroundColor(savedColor);

  swatches.forEach(swatch => {
    const color = swatch.getAttribute('data-color');
    if (color === savedColor) {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    }

    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      applySolidBackgroundColor(color);
      localStorage.setItem('f1_solid_bg', color);
      if (window.soundFX) window.soundFX.playRadioBeep();
    });
  });
}

function applySolidBackgroundColor(hex) {
  document.documentElement.style.setProperty('--rb-dark-bg', hex);
  document.body.style.backgroundColor = hex;
  document.body.style.background = hex;
}

// ========================================================
// INITIALIZATION ON DOM READY
// ========================================================
window.addEventListener('DOMContentLoaded', () => {
  setupSolidBackgroundSwitcher();
  setupCursorAndScroll();
  setupAudioToggle();
  setupConnectTab();
  setupProjectTaskbar();

  // Initial HUD RPM lights pulse
  let p = 0;
  const rpmInterval = setInterval(() => {
    p += 0.15;
    window.updateHudRpm(p);
    if (p >= 1) {
      clearInterval(rpmInterval);
      setTimeout(() => window.updateHudRpm(0.4), 300);
    }
  }, 60);
});
