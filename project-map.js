(() => {
  const root = document.querySelector('#project-map');
  if (!root) return;
  const loadButton = document.querySelector('#load-project-map');
  const status = document.querySelector('#map-status');
  const detailsLink = document.querySelector('#map-project-details');
  let projects = [], map, markers = new Map(), selectedId = 'aivazovsky';
  const ready = fetch('assets/project-map.json?v=20261117-airis-aqua').then(response => {
    if (!response.ok) throw new Error('Map data');
    return response.json();
  }).then(data => { projects = data.projects; return projects; });
  // Attach an error handler immediately, even if the visitor never opens the map.
  ready.catch(() => { status.textContent = 'Не удалось загрузить данные карты. Обзоры ЖК доступны в каталоге выше.'; });
  function selectProject(id, moveMap = true) {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    selectedId = id;
    root.querySelectorAll('[data-map-project]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mapProject === id)));
    document.querySelector('#map-project-name').textContent = `ЖК «${project.name}»`;
    document.querySelector('#map-project-address').textContent = project.address;
    document.querySelector('#map-project-description').textContent = project.text;
    const image = document.querySelector('#map-project-image');
    image.src = project.image; image.alt = `Визуализация ЖК ${project.name}`;
    detailsLink.href = '#' + id;
    document.querySelector('#map-external-link').href = `https://yandex.ru/maps/?ll=${project.lng}%2C${project.lat}&z=15&pt=${project.lng}%2C${project.lat}`;
    if (map && moveMap) { map.setView([project.lat, project.lng], 14); markers.get(id).openPopup(); }
  }
  root.querySelectorAll('[data-map-project]').forEach(button => button.addEventListener('click', async () => {
    try { await ready; selectProject(button.dataset.mapProject); } catch { /* Visible status is set above. */ }
  }));
  detailsLink.addEventListener('click', event => {
    event.preventDefault();
    history.pushState(null, '', '#' + selectedId);
    openProject(selectedId);
  });
  function fitProjects() { map.fitBounds(projects.map(p => [p.lat, p.lng]), { padding: [45, 45], maxZoom: 12 }); }
  loadButton.addEventListener('click', async () => {
    loadButton.disabled = true; status.textContent = 'Загружаем карту…';
    try {
      await ready;
      if (!window.L) throw new Error('Map library');
      document.querySelector('#map-gate').hidden = true;
      map = L.map('project-map-canvas', { scrollWheelZoom: false });
      let anyTileLoaded = false;
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });
      tiles.on('tileload', () => { anyTileLoaded = true; status.textContent = ''; });
      tiles.on('tileerror', () => {
        if (!anyTileLoaded) status.textContent = 'Фон карты недоступен. Выберите ЖК в списке: обзоры работают, также можно открыть расположение в Яндекс.Картах.';
      });
      tiles.addTo(map);
      projects.forEach((project, index) => {
        const icon = L.divIcon({ className: 'project-map-marker', html: `<span><b>${index + 1}</b></span>`, iconSize: [36, 42], iconAnchor: [18, 42], popupAnchor: [0, -38] });
        const marker = L.marker([project.lat, project.lng], { icon, title: `ЖК «${project.name}»`, alt: `ЖК ${project.name}`, keyboard: true }).addTo(map);
        const popup = document.createElement('div'); popup.className = 'map-popup';
        const image = document.createElement('img'); image.src = project.image; image.alt = `Визуализация ЖК ${project.name}`;
        const title = document.createElement('strong'); title.textContent = `ЖК «${project.name}»`;
        const text = document.createElement('p'); text.textContent = project.text;
        const link = document.createElement('a'); link.href = '#' + project.id; link.textContent = 'Обзор, фото и планировки →';
        link.addEventListener('click', event => { event.preventDefault(); history.pushState(null, '', '#' + project.id); openProject(project.id); });
        popup.append(image, title, text, link); marker.bindPopup(popup, { maxWidth: 260 });
        marker.on('click', () => selectProject(project.id, false)); markers.set(project.id, marker);
      });
      fitProjects();
      document.querySelector('#map-show-all').hidden = false;
      status.textContent = 'Выберите отметку ЖК, чтобы открыть краткий обзор.';
      new ResizeObserver(() => map.invalidateSize()).observe(document.querySelector('#project-map-canvas'));
    } catch {
      document.querySelector('#map-gate').hidden = false;
      loadButton.disabled = false;
      status.textContent = 'Карта временно недоступна. Выберите ЖК в списке или откройте Яндекс.Карты.';
    }
  });
  document.querySelector('#map-show-all').addEventListener('click', () => { if (map) fitProjects(); });
})();
