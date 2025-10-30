import * as THREE from 'three';

export class Inventory {
  constructor() {
    // === Inject dungeon-style CSS dynamically ===
    this.injectStyles();

    // === Create container dynamically ===
    this.container = document.createElement('div');
    this.container.id = 'inventory-container';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
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
      @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');

      .inventory-bar {
        display: flex;
        flex-direction: row;
        gap: 10px;
        background: rgba(20, 20, 20, 0.85);
        border: 3px solid #4b2e05;
        border-radius: 12px;
        padding: 10px 20px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(6px);
        flex-wrap: nowrap;
        white-space: nowrap;
      }

      .inventory-slot {
        width: 64px;
        height: 64px;
        border: 2px solid #7a5c2f;
        background: radial-gradient(circle at center, #2b2b2b 0%, #1a1a1a 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        box-shadow: inset 0 0 8px #000;
        transition: transform 0.1s ease-in-out, border-color 0.2s, box-shadow 0.2s;
        position: relative;
        flex-shrink: 0;
      }

      .inventory-slot:hover {
        transform: scale(1.1);
      }

      .inventory-slot.selected {
        border-color: #d4af37;
        box-shadow: 0 0 12px #d4af37, inset 0 0 8px #000;
      }

      .item-img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .slot-label {
        position: absolute;
        bottom: 2px;
        right: 6px;
        color: #c2b280;
        font-size: 12px;
        font-family: monospace;
        text-shadow: 0 0 3px #000;
        user-select: none;
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
