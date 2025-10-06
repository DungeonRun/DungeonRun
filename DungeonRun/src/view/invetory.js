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
    this.maxSlots = 5;
    this.selectedIndex = 0;

    this.createInventoryUI();
    this.setupKeyboardControls();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');

      body {
        margin: 0;
        overflow: hidden;
        background-color: #1a1a1a;
        font-family: 'MedievalSharp', cursive;
      }

      .inventory-bar {
        display: flex;
        gap: 10px;
        background: rgba(20, 20, 20, 0.85);
        border: 3px solid #4b2e05;
        border-radius: 12px;
        padding: 10px 20px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(6px);
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

      slot.appendChild(label);
      this.inventoryBar.appendChild(slot);
      this.slots.push({ element: slot, img: null });
    }

    this.container.appendChild(this.inventoryBar);
    this.updateSelection();
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
        this.selectedIndex = num - 1;
        this.updateSelection();
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
}
