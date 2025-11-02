import * as THREE from 'three';

export class Inventory {
  constructor() {
    // === Inject dungeon-style CSS dynamically ===
    this.injectStyles();

    // === Create container dynamically ===
    this.container = document.createElement('div');
    this.container.id = 'inventory-container';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '32px';
    this.container.style.left = '50%';
    this.container.style.transform = 'translateX(-50%)';
    this.container.style.zIndex = '100';
    document.body.appendChild(this.container);

    // === Inventory setup ===
  this.slots = [];
  this.maxSlots = 3;
  this.selectedIndex = 0;

  // slot mapping: 0 = punch, 1 = sword, 2 = spell
  this.items = ['punch', 'sword', 'spell'];

  // cooldowns: objects { end: timestamp(ms), duration: seconds }
  this.cooldowns = new Array(this.maxSlots).fill(null).map(() => ({ end: 0, duration: 0 }));
  this._running = true;
  this._rafId = null;


    this.createInventoryUI();
    this.setupKeyboardControls();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      .inventory-bar {
        display: flex;
        flex-direction: row;
        gap: 15px;
        background: rgba(20, 20, 20, 0.9);
        border: 3px solid #8b0000;
        border-radius: 15px;
        padding: 15px 30px;
        box-shadow: 0 0 25px rgba(139, 0, 0, 0.7), inset 0 0 20px rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(8px);
        align-items: center;
      }

      .inventory-title {
        color: #ff4500;
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 3px;
        margin-right: 15px;
        text-shadow: 0 0 10px #ff0000, 0 0 15px #8b0000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        user-select: none;
      }

      .inventory-slot {
        width: 65px;
        height: 65px;
        border: 3px solid #4a0000;
        background: linear-gradient(135deg, #1a0000 0%, #000 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.95);
        transition: all 0.2s ease;
        position: relative;
        cursor: pointer;
      }

      .inventory-slot:hover {
        transform: scale(1.1);
        border-color: #660000;
        box-shadow: 0 0 15px rgba(139, 0, 0, 0.6), inset 0 3px 10px rgba(0, 0, 0, 0.95);
      }

      .inventory-slot.selected {
        border-color: #ff4500;
        box-shadow: 0 0 20px rgba(255, 69, 0, 0.9), inset 0 0 12px rgba(255, 0, 0, 0.4);
        animation: selectedPulse 1.5s ease-in-out infinite;
      }

      @keyframes selectedPulse {
        0%, 100% { 
          box-shadow: 0 0 20px rgba(255, 69, 0, 0.9), inset 0 0 12px rgba(255, 0, 0, 0.4);
        }
        50% { 
          box-shadow: 0 0 30px rgba(255, 69, 0, 1), inset 0 0 18px rgba(255, 0, 0, 0.6);
        }
      }

      .item-img {
        width: 50px;
        height: 50px;
        object-fit: contain;
        image-rendering: pixelated;
        pointer-events: none;
        filter: drop-shadow(0 0 5px rgba(255, 69, 0, 0.3));
      }

      .inventory-slot.selected .item-img {
        filter: drop-shadow(0 0 10px rgba(255, 69, 0, 0.7));
      }

      .slot-label {
        position: absolute;
        top: 3px;
        right: 5px;
        color: #ff4500;
        font-size: 14px;
        font-weight: bold;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        text-shadow: 0 0 6px #ff0000, 0 0 3px #000;
        user-select: none;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #660000;
      }

      .cooldown-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0%;
        background: rgba(139, 0, 0, 0.8);
        border-radius: 7px;
        transition: height 0.1s linear;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  createInventoryUI() {
    this.inventoryBar = document.createElement('div');
    this.inventoryBar.classList.add('inventory-bar');


    for (let i = 0; i < this.maxSlots; i++) {
      const slot = document.createElement('div');
      slot.classList.add('inventory-slot');

      const label = document.createElement('span');
      label.classList.add('slot-label');
      label.innerText = i + 1;

      // grey overlay while cooling
      const greyOverlay = document.createElement('div');
      greyOverlay.style.position = 'absolute';
      greyOverlay.style.top = '0';
      greyOverlay.style.left = '0';
      greyOverlay.style.right = '0';
      greyOverlay.style.bottom = '0';
      greyOverlay.style.background = 'rgba(0,0,0,0.5)';
      greyOverlay.style.borderRadius = '8px';
      greyOverlay.style.display = 'none';
      greyOverlay.style.pointerEvents = 'none';

      // progress bar container
      const progress = document.createElement('div');
      progress.style.position = 'absolute';
      progress.style.height = '6px';
      progress.style.left = '4px';
      progress.style.right = '4px';
      progress.style.bottom = '4px';
      progress.style.background = 'rgba(255,255,255,0.08)';
      progress.style.borderRadius = '4px';
      progress.style.overflow = 'hidden';
      progress.style.pointerEvents = 'none';

      const progressFill = document.createElement('div');
      progressFill.style.height = '100%';
      progressFill.style.width = '0%';
      progressFill.style.background = '#4b8cff';

      progress.appendChild(progressFill);

      slot.appendChild(label);
      // human-readable item text (e.g., punch, swing, spell)
      const itemText = document.createElement('div');
      itemText.classList.add('item-text');
      itemText.style.position = 'absolute';
      itemText.style.bottom = '6px';
      itemText.style.left = '50%';
      itemText.style.transform = 'translateX(-50%)';
      itemText.style.fontSize = '12px';
      itemText.style.color = '#ffb4a3';
      itemText.style.textTransform = 'capitalize';
      itemText.style.fontWeight = '700';
      itemText.style.letterSpacing = '0.6px';
      itemText.style.textShadow = '0 0 6px #220000';
      itemText.style.userSelect = 'none';
      itemText.style.pointerEvents = 'none';
      itemText.textContent = this.items[i] || '';
      slot.appendChild(itemText);
      slot.appendChild(greyOverlay);
      slot.appendChild(progress);

      this.inventoryBar.appendChild(slot);
      this.slots.push({ element: slot, img: null, greyOverlay, progress, progressFill });
    }

    this.container.appendChild(this.inventoryBar);
    this.updateSelection();
    // start UI updater
    this._startLoop();
  }

  addItem(imagePath) {
    for (let slot of this.slots) {
      // Skip if slot already has an item
      if (slot.img) continue;

      const testImage = new Image();
      testImage.onload = () => {
        const img = document.createElement('img');
        img.src = imagePath;
        img.classList.add('item-img');
        slot.element.insertBefore(img, slot.element.firstChild);
        slot.img = img;
      };
      testImage.onerror = () => {
        console.warn(`Image not found: ${imagePath}. Skipping.`);
      };
      testImage.src = imagePath;

      return;
    }
    console.warn('Inventory is full!');
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= this.maxSlots) {
        this.select(num - 1);
      }
      // quick toggle with q/Q handled in main input as well but allow here
      if (e.key.toLowerCase() === 'q') {
        this.switchItem();
      }
    });
  }

  updateSelection() {
    this.slots.forEach((slot, i) => {
      if (i === this.selectedIndex) {
        slot.element.classList.add('selected');
      } else {
        slot.element.classList.remove('selected');
      }
    });
  }

  // Visual cooldown indicator
  updateCooldownVisual(idx, progress) {
    if (this.slots[idx] && this.slots[idx].cooldownOverlay) {
      // progress should be 0 (ready) to 1 (full cooldown)
      const height = Math.min(100, Math.max(0, progress * 100));
      this.slots[idx].cooldownOverlay.style.height = `${height}%`;
    }
  }

  //might be redundant, we'll see
  switchItem() {
    const next = (this.selectedIndex + 1) % this.maxSlots;
    this.select(next);
  }

  select(idx) {
    if (idx < 0 || idx >= this.maxSlots) return;
    this.selectedIndex = idx;
    this.updateSelection();
  }

  getSelected() {
    return this.items[this.selectedIndex];
  }

  // Start a cooldown in seconds for slot idx
  startCooldown(idx, durationSec) {
    const now = performance.now();
    this.cooldowns[idx] = { end: now + durationSec * 1000, duration: durationSec };
  }

  // is slot still cooling?
  isOnCooldown(idx) {
    const now = performance.now();
    return this.cooldowns[idx] && now < this.cooldowns[idx].end;
  }

  // 0..1 progress for cooldown (0 means just started, 1 means finished)
  getCooldownProgress(idx) {
    const now = performance.now();
    const cd = this.cooldowns[idx];
    if (!cd || cd.duration <= 0) return 1;
    const start = cd.end - cd.duration * 1000;
    const elapsed = now - start;
    return Math.min(1, Math.max(0, elapsed / (cd.duration * 1000)));
  }

  remove() {
        this._running = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

  _startLoop() {
    const update = () => {
      if (!this._running) return;
      for (let i = 0; i < this.slots.length; i++) {
        const s = this.slots[i];
        const onCD = this.isOnCooldown(i);
        if (onCD) {
          s.greyOverlay.style.display = 'block';
          const prog = this.getCooldownProgress(i) * 100;
          s.progressFill.style.width = prog + '%';
        } else {
          s.greyOverlay.style.display = 'none';
          s.progressFill.style.width = '100%';
        }
      }
      this._rafId = requestAnimationFrame(update);
    };
    this._rafId = requestAnimationFrame(update);
  }
}