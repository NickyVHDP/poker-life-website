/* Homepage interactions only. Checkout/catalog remain owned by script.js. */
(() => {
  const slides = [...document.querySelectorAll('[data-book-slide]')];
  const dots = [...document.querySelectorAll('[data-carousel-index]')];
  let active = 0;
  function showSlide(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    dots.forEach((dot, i) => {
      if (i === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    const status = document.querySelector('[data-carousel-status]');
    if (status) status.textContent = slides[active].getAttribute('aria-label');
  }
  document.querySelectorAll('[data-carousel-step]').forEach(button =>
    button.addEventListener('click', () => showSlide(active + Number(button.dataset.carouselStep))));
  dots.forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.carouselIndex))));
  const showcase = document.querySelector('.pl-book-showcase');
  showcase?.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(active + (event.key === 'ArrowRight' ? 1 : -1));
      // A hidden slide must never retain keyboard focus.
      dots[active].focus();
    }
  });

  const previews = {
    'behind-the-felt': {
      eyebrow: 'From the Poker Life collection',
      title: 'Behind the Felt',
      content: '<p>Real stories from inside the poker world.</p><p>This title appears in the new collection artwork but is not currently available to purchase on the site. Explore the available, personally signed paperbacks in the book library.</p><a class="pl-dialog-link" href="books.html">Browse available books →</a>'
    },
    coins: {
      eyebrow: 'Collection preview',
      title: 'Poker Life Card Protectors',
      content: '<p>The signature Poker Life coin collection is coming to the shop. The artwork shows the planned design; ordering and pricing are not available yet.</p><p>No payment is taken for this preview.</p><a class="pl-dialog-link" href="shop.html#merch">Explore Poker Life gear →</a>'
    },
    community: {
      eyebrow: 'More than just a game',
      title: 'The Poker Life Community',
      content: '<p>A place for players, dreamers, and grinders. The community and email list are not open for sign-ups yet.</p><p>In the meantime, explore Larry’s books and poker articles. There’s no membership or payment required to read the articles.</p><a class="pl-dialog-link" href="articles.html">Explore poker articles →</a>'
    },
    resources: {
      eyebrow: 'Poker resources',
      title: 'Explore the Poker World',
      content: '<p>Visit these independent sites for poker information and resources:</p><ul><li><a href="https://www.worldpokertour.com/" target="_blank" rel="noopener noreferrer">World Poker Tour</a> — events, results, and poker coverage.</li><li><a href="https://www.pokeratlas.com/" target="_blank" rel="noopener noreferrer">PokerAtlas</a> — poker rooms and tournament listings.</li><li><a href="https://www.acrpoker.eu/" target="_blank" rel="noopener noreferrer">ACR Poker (Americas Cardroom)</a></li><li><a href="https://www.pokerstars.com/" target="_blank" rel="noopener noreferrer">PokerStars</a></li></ul><p>Links open third-party sites. Availability and age requirements vary by location. These links do not imply a partnership or endorsement by those brands.</p>'
    }
  };
  const dialog = document.querySelector('#pl-preview-dialog');
  let previousFocus;
  document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
    const preview = previews[button.dataset.preview];
    if (!preview || !dialog) return;
    dialog.querySelector('[data-preview-eyebrow]').textContent = preview.eyebrow;
    dialog.querySelector('#pl-preview-title').textContent = preview.title;
    dialog.querySelector('[data-preview-content]').innerHTML = preview.content;
    previousFocus = button;
    dialog.showModal();
  }));
  dialog?.querySelector('[data-preview-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => previousFocus?.focus());
})();
