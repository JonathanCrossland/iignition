class RatingComponent extends HTMLElement {
    private _maxRating: number = 5;
    private _currentRating: number = 0;
  
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    connectedCallback() {
      this.render();
      this.shadowRoot!.addEventListener('click', this.setRating.bind(this));
    }
  
    setRating(event: Event) {
      const target = event.target as HTMLElement;
      const ratingValue = Number(target.dataset.rating);
      if (ratingValue) {
        this._currentRating = ratingValue;
        this.highlightRating();
        this.dispatchEvent(new CustomEvent('rating-changed', { detail: this._currentRating }));
      }
    }
  
    highlightRating() {
      const stars = this.shadowRoot!.querySelectorAll('.star');
      stars.forEach((star, index) => {
        star.textContent = index < this._currentRating ? '★' : '☆';
      });
    }
  
    render() {
      const starContainer = document.createElement('div');
      starContainer.style.display = 'inline-flex';
  
      for (let i = 1; i <= this._maxRating; i++) {
        const star = document.createElement('span');
        star.textContent = '☆';
        star.dataset.rating = String(i);
        star.className = 'star';
        star.style.cursor = 'pointer';
        star.style.fontSize = '24px';
        starContainer.appendChild(star);
      }
  
      if (this.shadowRoot!.firstChild) {
        this.shadowRoot!.replaceChild(starContainer, this.shadowRoot!.firstChild);
      } else {
        this.shadowRoot!.appendChild(starContainer);
      }
  
      this.highlightRating();
    }
  }
  
  customElements.define('rating-component', RatingComponent);
  