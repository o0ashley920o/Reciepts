function getModalRoot() {
  let root = document.querySelector('#app-modal');
  if (root) return root;
  root = document.createElement('dialog');
  root.id = 'app-modal';
  root.className = 'app-modal';
  root.innerHTML = `
    <form method="dialog" class="app-modal__panel">
      <h3 id="app-modal-title"></h3>
      <p id="app-modal-body"></p>
      <menu>
        <button value="cancel" class="secondary-button" type="button" data-action="cancel">Cancel</button>
        <button value="confirm" class="button" type="button" data-action="confirm">Confirm</button>
      </menu>
    </form>
  `;
  document.body.append(root);
  return root;
}

export function closeModal() {
  const root = document.querySelector('#app-modal');
  if (!root) return;
  root.close();
}

export function openModal({ title = 'Confirm', body = '', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
  const root = getModalRoot();
  root.querySelector('#app-modal-title').textContent = title;
  root.querySelector('#app-modal-body').textContent = body;
  root.querySelector('[data-action="confirm"]').textContent = confirmText;
  root.querySelector('[data-action="cancel"]').textContent = cancelText;

  return new Promise((resolve) => {
    const confirmButton = root.querySelector('[data-action="confirm"]');
    const cancelButton = root.querySelector('[data-action="cancel"]');

    const cleanup = () => {
      confirmButton.removeEventListener('click', onConfirm);
      cancelButton.removeEventListener('click', onCancel);
      root.removeEventListener('cancel', onCancel);
      root.removeEventListener('close', onDialogClose);
    };

    const onConfirm = () => {
      cleanup();
      root.close();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      root.close();
      resolve(false);
    };

    const onDialogClose = () => {
      cleanup();
      resolve(false);
    };

    confirmButton.addEventListener('click', onConfirm);
    cancelButton.addEventListener('click', onCancel);
    root.addEventListener('cancel', onCancel);
    root.addEventListener('close', onDialogClose);

    root.showModal();
  });
}
