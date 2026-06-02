function openDrawer(tab) {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;
  drawer.showModal();
  requestAnimationFrame(() => drawer.classList.add('open'));
  document.body.style.overflow = 'hidden';
  if (tab) switchTab(tab);
}

function closeDrawer() {
  const drawer = document.getElementById('drawer');
  if (!drawer?.open) return;
  drawer.classList.remove('open');
  setTimeout(() => {
    drawer.close();
    document.body.style.overflow = '';
  }, 300);
}

function switchTab(tab) {
  ['vehicle', 'employee'].forEach(t => {
    document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    const panel = document.getElementById('panel-' + t);
    if (panel) panel.hidden = t !== tab;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  if (!drawer) return;

  // Clic en el ::backdrop llega al <dialog> con e.target === drawer
  drawer.addEventListener('click', e => {
    if (e.target === drawer) closeDrawer();
  });

  // Escape nativo: prevenir cierre inmediato y usar nuestra animación
  drawer.addEventListener('cancel', e => {
    e.preventDefault();
    closeDrawer();
  });
});
