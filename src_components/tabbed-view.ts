class TabbedView extends HTMLElement {
  private tabsContainer: HTMLElement;
  private slotElement: HTMLSlotElement;
  private tabPanels: HTMLElement[];
  private tabItemsContainer: HTMLElement;

  constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
          <style>
              :host {
                  display: block;
                  --tab-content-bg: var(--tab-content-bg-color, #ffffff);
                  --tab-inactive-bg: var(--tab-inactive-bg-color, #f5f5f5);
                  --tab-active-bg: var(--tab-active-bg-color, #ffffff);
                  --tab-text-color: var(--tab-color, #333333);
                  --tab-border: var(--tab-border-color, #dddddd);
                  --tab-active-border: var(--tab-active-border-color, #ff6b00);
                  --tab-padding: var(--tab-padding, 10px);
                  --tab-font-size: var(--tab-font-size, 9pt);
              }
              ::slotted(tab-panel) {
                  display: none;
                  background-color: var(--tab-content-bg);
              }
              ::slotted(tab-panel[active]) {
                  display: block;
              }
              .tabContainer {
                  background-color: var(--tab-inactive-bg);
                  display: flex;
                  justify-content: space-between;
              }
              .tabs {
                  display: flex;
                  cursor: pointer;
                  position: -webkit-sticky; /* For Safari */
                  position: sticky;
                  top: 0;
                  background-color: var(--tab-inactive-bg);
                  z-index: 10;
                  color: var(--tab-text-color);
                  font-size: var(--tab-font-size);
              }
              .tabs > div {
                  padding: var(--tab-padding);
                  border: 1px solid var(--tab-border);
                  border-bottom: none;
              }
              .tabs > div[active] {
                  background-color: var(--tab-active-bg);
                  border-bottom: 1px solid var(--tab-active-border);
              }
              .tab-items {
                  display: flex;
                  align-items: center;
                  margin-left: auto;
              }
              .tab-items > div {
                  margin-left: auto;
                  padding: var(--tab-padding);
              }
          </style>
          <div class="tabContainer">
              <div class="tabs"></div>
              <div class="tab-items"></div>
          </div>
          <slot></slot>
      `;

      this.tabsContainer = shadow.querySelector('.tabs') as HTMLElement;
      this.slotElement = shadow.querySelector('slot') as HTMLSlotElement;
      this.tabItemsContainer = shadow.querySelector('.tab-items') as HTMLElement;
      this.tabPanels = [];

      this.slotElement.addEventListener('slotchange', () => {
          this.tabPanels = Array.from(this.querySelectorAll('tab-panel'));
          this.renderTabs();
          if (this.tabPanels.length > 0) {
              this.selectTab(0);
          }
      });
  }

  private renderTabs() {
      this.tabsContainer.innerHTML = '';
      this.tabPanels.forEach((panel, index) => {
          const tab = document.createElement('div');
          tab.textContent = panel.getAttribute('label');
          tab.addEventListener('click', () => this.selectTab(index));
          this.tabsContainer.appendChild(tab);
      });

      this.renderTabItems();
  }

  private renderTabItems() {
      this.tabItemsContainer.innerHTML = '';
      const tabItems = Array.from(this.querySelectorAll('tab-item'));
      tabItems.forEach((item) => {
          const tabItem = document.createElement('div');
          tabItem.innerHTML = item.innerHTML;
          this.tabItemsContainer.appendChild(tabItem);
          (item as HTMLElement).style.display = 'none'; // Hide original tab-item elements in the light DOM
      });
  }

  private selectTab(index: number) {
      this.tabPanels.forEach((panel, idx) => {
          if (idx === index) {
              panel.setAttribute('active', '');
              this.tabsContainer.children[idx].setAttribute('active', '');
          } else {
              panel.removeAttribute('active');
              this.tabsContainer.children[idx].removeAttribute('active');
          }
      });
  }
}

customElements.define('tabbed-view', TabbedView);
