/* Homepage interactions only. Checkout/catalog remain owned by script.js. */
(() => {

  const previews = {
    'behind-the-felt': {
      eyebrow: 'From the Poker Life collection',
      title: 'Behind the Felt',
      content: '<p>Real stories from inside the poker world.</p><p>This title appears in the new collection artwork but is not currently available to purchase on the site. Explore the available, personally signed paperbacks in the book library.</p><a class="pl-dialog-link" href="books.html">Browse available books →</a>'

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
