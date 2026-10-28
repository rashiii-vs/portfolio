/**
 * Ferrari Aperta - Melih Çavdar Steering Wheel Controller
 * Handles cursor drag, anti-clockwise rotation calculation, LED shift lights,
 * sound triggers, and smooth launch to Page 2.
 */

class FerrariApertaWheel {
  constructor() {
    this.housing = document.getElementById('wheel-housing');
    this.rotator = document.getElementById('wheel-rotator');
    this.degDisplay = document.getElementById('wheel-deg-display');
    this.statusText = document.getElementById('wheel-status-text');
    this.quickBtn = document.getElementById('wheel-quick-shift');
    this.leds = document.querySelectorAll('#wheel-led-arch .w-led');

    this.isDragging = false;
    this.startAngle = 0;
    this.currentRotation = 0; // Negative is anti-clockwise
    this.hasTriggeredLaunch = false;
    this.targetLaunchDegrees = -85; // Rotating ~90 deg anti-clockwise triggers launch

    this.init();
  }

  init() {
    if (!this.housing || !this.rotator) return;

    // Mouse events
    this.housing.addEventListener('mousedown', (e) => this.onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => this.onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.onEnd());

    // Touch events for mobile/trackpad
    this.housing.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => this.onEnd());

    // Quick engage button click
    if (this.quickBtn) {
      this.quickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.animateQuickLaunch();
      });
    }
  }

  getCenterCoordinates() {
    const rect = this.housing.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  calculateAngle(x, y) {
    const center = this.getCenterCoordinates();
    const rad = Math.atan2(y - center.y, x - center.x);
    let deg = rad * (180 / Math.PI);
    return deg;
  }

  onStart(x, y) {
    if (window.currentPageIndex !== 1) return;
    this.isDragging = true;
    this.startAngle = this.calculateAngle(x, y) - this.currentRotation;
    if (this.rotator) this.rotator.style.transition = 'none';

    // Play subtle throttle blip
    if (window.soundFX) {
      window.soundFX.playRev(0.3);
    }
  }

  onMove(x, y) {
    if (!this.isDragging || window.currentPageIndex !== 1 || this.hasTriggeredLaunch) return;

    const angle = this.calculateAngle(x, y);
    let delta = angle - this.startAngle;

    // Normalize delta
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    // If rotating anti-clockwise (delta is negative or turning counter-clockwise)
    this.currentRotation = delta;

    this.updateWheelVisuals();

    // Check if anti-clockwise rotation threshold reached
    if (this.currentRotation <= this.targetLaunchDegrees && !this.hasTriggeredLaunch) {
      this.triggerLaunch();
    }
  }

  onEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (!this.hasTriggeredLaunch) {
      // Spring back slightly if threshold not met
      if (this.rotator) {
        this.rotator.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        this.currentRotation = 0;
        this.rotator.style.transform = `rotate(0deg)`;
      }
      this.updateLEDs(0);
      if (this.degDisplay) this.degDisplay.textContent = '0.0°';
      if (this.statusText) {
        this.statusText.textContent = 'HOLD & ROTATE ↺';
        this.statusText.style.color = 'var(--rb-cyan)';
      }
    }
  }

  // Allow mouse wheel or cursor scroll to rotate the wheel anti-clockwise as well
  rotateByDelta(delta) {
    if (this.hasTriggeredLaunch || window.currentPageIndex !== 1) return;

    // Negative delta simulates anti-clockwise rotation
    this.currentRotation -= Math.abs(delta) * 0.45;
    this.updateWheelVisuals();

    if (this.currentRotation <= this.targetLaunchDegrees && !this.hasTriggeredLaunch) {
      this.triggerLaunch();
    }
  }

  updateWheelVisuals() {
    if (this.rotator) {
      this.rotator.style.transform = `rotate(${this.currentRotation}deg)`;
    }

    if (this.degDisplay) {
      this.degDisplay.textContent = `${this.currentRotation.toFixed(1)}°`;
    }

    // Ratio of rotation towards target (anti-clockwise)
    const progress = Math.min(Math.max(-this.currentRotation / Math.abs(this.targetLaunchDegrees), 0), 1);

    // Update LED shift lights
    this.updateLEDs(progress);

    // Update status text
    if (this.statusText) {
      if (this.currentRotation < 0) {
        const percent = Math.round(progress * 100);
        this.statusText.textContent = `ENGAGING ${percent}% ↺`;
        this.statusText.style.color = progress > 0.7 ? 'var(--rb-red)' : 'var(--rb-yellow)';
      } else {
        this.statusText.textContent = 'ROTATE ANTI-CLOCKWISE ↺';
        this.statusText.style.color = 'var(--rb-yellow)';
      }
    }

    // Update Top HUD RPM LEDs
    if (window.updateHudRpm) {
      window.updateHudRpm(progress);
    }
  }

  updateLEDs(progress) {
    const total = this.leds.length;
    const litCount = Math.floor(progress * total);

    this.leds.forEach((led, idx) => {
      led.className = 'w-led';
      if (idx < litCount) {
        if (idx < 4) {
          led.classList.add('lit-green');
        } else if (idx < 7) {
          led.classList.add('lit-yellow');
        } else if (idx < 9) {
          led.classList.add('lit-red');
        } else {
          led.classList.add('lit-blue');
        }
      }
    });
  }

  triggerLaunch() {
    this.hasTriggeredLaunch = true;
    this.isDragging = false;

    if (this.statusText) {
      this.statusText.textContent = 'GEAR 2 ENGAGED! LAUNCHING!';
      this.statusText.style.color = '#00ff66';
    }

    // Sound effect
    if (window.soundFX) {
      window.soundFX.playShift();
      window.soundFX.playRev(1.0);
    }

    // Shift animation
    if (this.rotator) {
      this.rotator.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      this.rotator.style.transform = `rotate(-120deg) scale(1.05)`;
    }

    // Flash all LEDs blue/red
    this.leds.forEach(led => {
      led.className = 'w-led lit-blue';
    });

    // Advance to Page 2
    setTimeout(() => {
      if (window.navigateToPage) {
        window.navigateToPage(2);
      }
      setTimeout(() => {
        this.reset();
      }, 1000);
    }, 600);
  }

  animateQuickLaunch() {
    if (this.hasTriggeredLaunch) return;
    let step = 0;
    const interval = setInterval(() => {
      step += 12;
      this.currentRotation = -step;
      this.updateWheelVisuals();
      if (step >= Math.abs(this.targetLaunchDegrees)) {
        clearInterval(interval);
        this.triggerLaunch();
      }
    }, 30);
  }

  reset() {
    this.hasTriggeredLaunch = false;
    this.isDragging = false;
    this.currentRotation = 0;
    if (this.rotator) {
      this.rotator.style.transition = 'transform 0.4s ease';
      this.rotator.style.transform = 'rotate(0deg) scale(1)';
    }
    this.updateLEDs(0);
    if (this.degDisplay) this.degDisplay.textContent = '0.0°';
    if (this.statusText) {
      this.statusText.textContent = 'HOLD & ROTATE ↺';
      this.statusText.style.color = 'var(--rb-cyan)';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.ferrariWheel = new FerrariApertaWheel();
});
