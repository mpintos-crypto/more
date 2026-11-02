const STORAGE_KEY = 'entreclase.events.v1';
const CLASS_STORAGE_KEY = 'entreclase.classes.v1';
const ROLE_KEY = 'entreclase.role.v1';

const eventGrid = document.querySelector('#event-grid');
const eventDialog = document.querySelector('#event-dialog');
const eventForm = document.querySelector('#event-form');
const chatMessages = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const chatComposer = document.querySelector('.chat-composer');
const emojiToggle = document.querySelector('#emoji-toggle');
const emojiPicker = document.querySelector('#emoji-picker');
const emojiStatus = document.querySelector('#emoji-status');
const roleSelect = document.querySelector('#role-select');
const dashboardView = document.querySelector('#dashboard-view');
const classesView = document.querySelector('#classes-view');
const classGrid = document.querySelector('#class-grid');
const classDialog = document.querySelector('#class-dialog');
const classForm = document.querySelector('#class-form');
const classNameInput = document.querySelector('#class-name');
const workspace = document.querySelector('#inicio');
const topbarPageLabel = document.querySelector('#topbar-page-label');
const eventTypeLabels = {
  examen: { label: 'Examen', icon: '✎' },
  aviso: { label: 'Aviso docente', icon: '◉' },
  entrega: { label: 'Entrega', icon: '✓' }
};

let events = loadEvents();
let classes = loadClasses();
let activeFilter = 'todos';
let nextReplyId = 0;
let nextReplyToRender = 0;
const pendingReplies = new Map();

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved)) return saved.filter(isValidEvent);
  } catch (error) {
    console.warn('No se pudo leer la agenda guardada.', error);
  }

  const examples = createExampleEvents();
  saveEvents(examples);
  return examples;
}

function isValidEvent(event) {
  return event && typeof event.id === 'string' && typeof event.title === 'string'
    && Object.hasOwn(eventTypeLabels, event.type) && typeof event.date === 'string';
}

function saveEvents(nextEvents) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
    return true;
  } catch (error) {
    console.error('No se pudo guardar la agenda en este navegador.', error);
    return false;
  }
}

function loadClasses() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) return saved.filter(isValidClass);
    console.warn('Los datos guardados de las clases no tienen un formato válido.');
  } catch (error) {
    console.warn('No se pudieron leer las clases guardadas.', error);
  }
  return [];
}

function isValidClass(course) {
  return course && typeof course.id === 'string' && typeof course.name === 'string'
    && typeof course.subject === 'string' && typeof course.teacher === 'string';
}

function saveClasses(nextClasses) {
  try {
    localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(nextClasses));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar las clases en este navegador.', error);
    return false;
  }
}

function renderClasses() {
  classGrid.replaceChildren();
  document.querySelector('#class-count').textContent = `${classes.length} ${classes.length === 1 ? 'clase' : 'clases'}`;

  if (classes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'class-empty';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▣';
    const title = document.createElement('strong');
    title.textContent = 'Todavía no tienes clases';
    const detail = document.createElement('p');
    detail.textContent = 'Crea una clase para tenerla siempre a mano. Seguirá aquí aunque aún no tenga avisos.';
    const createButton = document.createElement('button');
    createButton.className = 'class-add-button';
    createButton.type = 'button';
    createButton.dataset.classAction = 'create';
    createButton.innerHTML = '<span aria-hidden="true">＋</span> Crear primera clase';
    empty.append(icon, title, detail, createButton);
    classGrid.append(empty);
    return;
  }

  classes.forEach((course) => {
    const card = document.createElement('article');
    card.className = 'class-card';

    const cover = document.createElement('div');
    cover.className = 'class-card-cover';
    const heading = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = course.name;
    heading.append(title);
    if (course.subject) {
      const subject = document.createElement('p');
      subject.textContent = course.subject;
      heading.append(subject);
    }
    const mark = document.createElement('span');
    mark.className = 'class-card-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '▣';
    cover.append(heading, mark);

    const details = document.createElement('div');
    details.className = 'class-card-details';
    const teacherMark = document.createElement('span');
    teacherMark.className = 'class-teacher-mark';
    teacherMark.setAttribute('aria-hidden', 'true');
    teacherMark.textContent = '◉';
    const teacher = document.createElement('span');
    teacher.textContent = course.teacher || 'Docente sin asignar';
    details.append(teacherMark, teacher);

    const announcement = document.createElement('div');
    announcement.className = 'class-no-announcements';
    const announcementIcon = document.createElement('span');
    announcementIcon.setAttribute('aria-hidden', 'true');
    announcementIcon.textContent = '◌';
    const announcementCopy = document.createElement('div');
    const announcementTitle = document.createElement('strong');
    announcementTitle.textContent = 'Sin avisos todavía';
    const announcementDescription = document.createElement('p');
    announcementDescription.textContent = 'La clase permanece en tu lista aunque no haya novedades.';
    announcementCopy.append(announcementTitle, announcementDescription);
    announcement.append(announcementIcon, announcementCopy);

    const actions = document.createElement('div');
    actions.className = 'class-card-actions';
    actions.append(
      createClassActionButton('Editar clase', '↗', 'edit', course.id),
      createClassActionButton('Eliminar clase', '×', 'delete', course.id)
    );
    card.append(cover, details, announcement, actions);
    classGrid.append(card);
  });
}

function createClassActionButton(label, icon, action, id) {
  const button = document.createElement('button');
  button.className = `event-action${action === 'delete' ? ' delete' : ''}`;
  button.type = 'button';
  button.dataset.classAction = action;
  button.dataset.id = id;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.textContent = icon;
  return button;
}

function openCreateClassDialog() {
  classForm.reset();
  document.querySelector('#class-id').value = '';
  document.querySelector('#class-dialog-title').textContent = 'Crear clase';
  document.querySelector('#save-class').innerHTML = 'Guardar clase <span aria-hidden="true">→</span>';
  classDialog.showModal();
  classNameInput.focus();
}

function openEditClassDialog(id) {
  const course = classes.find((item) => item.id === id);
  if (!course) return;
  document.querySelector('#class-id').value = course.id;
  classNameInput.value = course.name;
  document.querySelector('#class-subject').value = course.subject;
  document.querySelector('#class-teacher').value = course.teacher;
  document.querySelector('#class-dialog-title').textContent = 'Editar clase';
  document.querySelector('#save-class').innerHTML = 'Guardar cambios <span aria-hidden="true">→</span>';
  classDialog.showModal();
  classNameInput.focus();
}

function handleClassSubmit(submitEvent) {
  submitEvent.preventDefault();
  if (!classForm.reportValidity()) return;

  const formData = new FormData(classForm);
  const id = String(formData.get('id') || '');
  const existing = classes.find((course) => course.id === id);
  const name = String(formData.get('name') || '').trim();
  if (!name) {
    classNameInput.setCustomValidity('Escribe el nombre de la clase.');
    classNameInput.reportValidity();
    classNameInput.setCustomValidity('');
    return;
  }

  const nextClass = {
    id: existing ? existing.id : createId(),
    name,
    subject: String(formData.get('subject') || '').trim(),
    teacher: String(formData.get('teacher') || '').trim()
  };
  const nextClasses = existing
    ? classes.map((course) => course.id === id ? nextClass : course)
    : [...classes, nextClass];
  if (!saveClasses(nextClasses)) return;
  classes = nextClasses;
  renderClasses();
  classDialog.close();
}

function handleClassAction(clickEvent) {
  const button = clickEvent.target.closest('button[data-class-action]');
  if (!button) return;
  if (button.dataset.classAction === 'create') {
    openCreateClassDialog();
    return;
  }
  if (button.dataset.classAction === 'edit') {
    openEditClassDialog(button.dataset.id);
    return;
  }
  if (button.dataset.classAction !== 'delete') return;

  const course = classes.find((item) => item.id === button.dataset.id);
  if (!course || !window.confirm(`¿Eliminar la clase “${course.name}”?`)) return;
  const nextClasses = classes.filter((item) => item.id !== course.id);
  if (!saveClasses(nextClasses)) return;
  classes = nextClasses;
  renderClasses();
}

function createExampleEvents() {
  const offsetDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toDateInputValue(date);
  };

  return [
    { id: createId(), title: 'Biología · Sistemas del cuerpo', type: 'examen', date: offsetDate(3), desc: 'Repasar los apuntes de los temas 4 y 5.', author: 'Docente' },
    { id: createId(), title: 'Lectura para el próximo encuentro', type: 'aviso', date: offsetDate(5), desc: 'Capítulos 2 y 3. Traer una pregunta para conversar en clase.', author: 'Docente' },
    { id: createId(), title: 'Historia · Línea de tiempo', type: 'entrega', date: offsetDate(8), desc: 'Entrega en parejas al inicio de la clase.', author: 'Delegado/a' }
  ];
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(dateString, options = { day: 'numeric', month: 'short' }) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('es', options).format(date);
}

function getUpcomingEvents(source = events) {
  const today = toDateInputValue(new Date());
  return source.filter((event) => event.date >= today)
    .sort((first, second) => first.date.localeCompare(second.date));
}

function renderEvents() {
  const visibleEvents = events
    .filter((event) => activeFilter === 'todos' || event.type === activeFilter)
    .sort((first, second) => first.date.localeCompare(second.date));
  eventGrid.replaceChildren();

  if (visibleEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '✳';
    const title = document.createElement('strong');
    title.textContent = activeFilter === 'todos' ? 'La agenda está despejada.' : 'Todavía no hay eventos de este tipo.';
    const detail = document.createElement('p');
    detail.textContent = activeFilter === 'todos' ? 'Añade una fecha importante para compartirla con el curso.' : 'Prueba otra categoría o añade un nuevo evento.';
    empty.append(icon, title, detail);
    eventGrid.append(empty);
  } else {
    visibleEvents.forEach((event) => eventGrid.append(createEventCard(event)));
  }

  document.querySelector('#all-count').textContent = String(events.length);
  document.querySelector('#event-count').textContent = `${visibleEvents.length} ${visibleEvents.length === 1 ? 'evento' : 'eventos'}`;
  document.querySelector('#footer-event-total').textContent = `${events.length} ${events.length === 1 ? 'evento guardado' : 'eventos guardados'}`;
  renderNextEvent();
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'event-card';
  card.dataset.type = event.type;

  const meta = document.createElement('div');
  meta.className = 'event-meta';
  const badge = document.createElement('span');
  badge.className = 'event-badge';
  badge.textContent = `${eventTypeLabels[event.type].icon} ${eventTypeLabels[event.type].label}`;
  const date = document.createElement('time');
  date.className = 'event-date';
  date.dateTime = event.date;
  date.textContent = formatDate(event.date, { day: 'numeric', month: 'short', year: 'numeric' });
  meta.append(badge, date);

  const title = document.createElement('h3');
  title.className = 'event-title';
  title.textContent = event.title;
  const description = document.createElement('p');
  description.className = 'event-description';
  description.textContent = event.desc || 'Sin detalles adicionales.';

  const footer = document.createElement('div');
  footer.className = 'event-footer';
  const author = document.createElement('span');
  author.className = 'event-author';
  author.textContent = `Añadido por ${event.author || 'Estudiante'}`;
  const actions = document.createElement('div');
  actions.className = 'event-actions';
  actions.append(createActionButton('Editar evento', '↗', 'edit', event.id), createActionButton('Eliminar evento', '×', 'delete', event.id));
  footer.append(author, actions);
  card.append(meta, title, description, footer);
  return card;
}

function createActionButton(label, icon, action, id) {
  const button = document.createElement('button');
  button.className = `event-action${action === 'delete' ? ' delete' : ''}`;
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.textContent = icon;
  return button;
}

function renderNextEvent() {
  const next = getUpcomingEvents()[0];
  document.querySelector('#next-event-title').textContent = next ? next.title : 'No hay eventos próximos';
  document.querySelector('#next-event-date').textContent = next ? formatDate(next.date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Agenda libre';
}

function openCreateDialog() {
  eventForm.reset();
  document.querySelector('#event-id').value = '';
  document.querySelector('#dialog-title').textContent = 'Nuevo evento';
  document.querySelector('#save-event').innerHTML = 'Guardar evento <span aria-hidden="true">→</span>';
  updateAuthorPreview();
  eventDialog.showModal();
  document.querySelector('#event-title').focus();
}

function openEditDialog(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;
  document.querySelector('#event-id').value = event.id;
  document.querySelector('#event-title').value = event.title;
  document.querySelector('#event-type').value = event.type;
  document.querySelector('#event-date').value = event.date;
  document.querySelector('#event-desc').value = event.desc || '';
  document.querySelector('#dialog-title').textContent = 'Editar evento';
  document.querySelector('#save-event').innerHTML = 'Guardar cambios <span aria-hidden="true">→</span>';
  updateAuthorPreview();
  eventDialog.showModal();
  document.querySelector('#event-title').focus();
}

function updateAuthorPreview() {
  document.querySelector('#author-preview').textContent = roleSelect.value;
}

function handleEventSubmit(submitEvent) {
  submitEvent.preventDefault();
  if (!eventForm.reportValidity()) return;
  const formData = new FormData(eventForm);
  const id = String(formData.get('id') || '');
  const existing = events.find((event) => event.id === id);
  const nextEvent = {
    id: existing ? existing.id : createId(),
    title: String(formData.get('title')).trim(),
    type: String(formData.get('type')),
    date: String(formData.get('date')),
    desc: String(formData.get('desc')).trim(),
    author: roleSelect.value
  };
  if (!nextEvent.title || !Object.hasOwn(eventTypeLabels, nextEvent.type)) return;

  const nextEvents = existing
    ? events.map((event) => event.id === id ? nextEvent : event)
    : [...events, nextEvent];
  if (!saveEvents(nextEvents)) return;
  events = nextEvents;
  renderEvents();
  eventDialog.close();
}

function handleEventAction(clickEvent) {
  const button = clickEvent.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') openEditDialog(button.dataset.id);
  if (button.dataset.action === 'delete') deleteEvent(button.dataset.id);
}

function deleteEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event || !window.confirm(`¿Eliminar “${event.title}” de la agenda?`)) return;
  const nextEvents = events.filter((item) => item.id !== id);
  if (!saveEvents(nextEvents)) return;
  events = nextEvents;
  renderEvents();
}

function appendMessage(text, sender) {
  const message = document.createElement('div');
  message.className = `message ${sender}`;
  const content = document.createElement('span');
  content.textContent = text;
  const time = document.createElement('time');
  time.className = 'message-time';
  time.dateTime = new Date().toISOString();
  time.textContent = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  message.append(content, time);
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function appendTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message bot';
  indicator.setAttribute('aria-label', 'more está escribiendo');
  const dots = document.createElement('span');
  dots.className = 'typing';
  dots.innerHTML = '<i></i><i></i><i></i>';
  indicator.append(dots);
  chatMessages.append(indicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return indicator;
}

function normalizeText(text) {
  return text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getRequestedTypes(message) {
  const text = normalizeText(message);
  const requested = new Set();
  if (/\b(examen(?:es)?|parcial(?:es)?|prueba(?:s)?|evaluacion(?:es)?)\b/.test(text)) requested.add('examen');
  if (/\b(aviso(?:s)?|anuncio(?:s)?|comunicado(?:s)?)\b/.test(text)) requested.add('aviso');
  if (/\b(entrega(?:s)?|tarea(?:s)?|trabajo(?:s)?)\b/.test(text)) requested.add('entrega');
  return requested;
}

function formatUpcomingEvents(foundEvents, hasCategory) {
  if (foundEvents.length === 0) {
    return hasCategory
      ? 'No encuentro próximos eventos de esa categoría. Puedes consultar otra o añadir una fecha nueva.'
      : 'No hay próximos eventos en la agenda. Puedes añadir una fecha nueva desde el formulario.';
  }
  const listedEvents = foundEvents.slice(0, 4).map((event) => `• ${formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${event.title}`);
  const remainder = foundEvents.length > listedEvents.length ? `\nY ${foundEvents.length - listedEvents.length} más en la agenda.` : '';
  return `${foundEvents.length === 1 ? 'Este es el próximo evento' : 'Estos son los próximos eventos'}${foundEvents.length > listedEvents.length ? ' (te muestro los primeros 4)' : ''}:\n${listedEvents.join('\n')}${remainder}`;
}

function buildBotReply(message) {
  const requestedTypes = getRequestedTypes(message);
  const upcoming = getUpcomingEvents(loadEvents());
  const matching = requestedTypes.size
    ? upcoming.filter((event) => requestedTypes.has(event.type))
    : upcoming;
  return formatUpcomingEvents(matching, requestedTypes.size > 0);
}

function setEmojiPickerOpen(isOpen) {
  emojiPicker.hidden = !isOpen;
  emojiToggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) emojiStatus.textContent = '';
}

function insertEmoji(button) {
  const emoji = button.textContent;
  const selectionStart = chatInput.selectionStart ?? chatInput.value.length;
  const selectionEnd = chatInput.selectionEnd ?? selectionStart;
  const nextLength = chatInput.value.length - (selectionEnd - selectionStart) + emoji.length;
  if (nextLength > chatInput.maxLength) {
    emojiStatus.textContent = `El mensaje alcanzó el límite de ${chatInput.maxLength} caracteres.`;
    return;
  }

  chatInput.setRangeText(emoji, selectionStart, selectionEnd, 'end');
  chatInput.focus();
  emojiStatus.textContent = `${button.getAttribute('aria-label')} agregado.`;
}

function handleChatSubmit(submitEvent) {
  submitEvent.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  setEmojiPickerOpen(false);
  appendMessage(message, 'user');
  chatInput.value = '';
  chatInput.focus();

  const replyId = nextReplyId++;
  const typingIndicator = appendTypingIndicator();
  const delay = 400 + Math.floor(Math.random() * 401);
  window.setTimeout(() => {
    pendingReplies.set(replyId, { message, typingIndicator });
    while (pendingReplies.has(nextReplyToRender)) {
      const pending = pendingReplies.get(nextReplyToRender);
      pendingReplies.delete(nextReplyToRender);
      pending.typingIndicator.remove();
      appendMessage(buildBotReply(pending.message), 'bot');
      nextReplyToRender += 1;
    }
  }, delay);
}

function addChatGreeting() {
  const greeting = '¡Hola! Soy more. Puedo buscar en la agenda. Pregúntame por exámenes, parciales, avisos o entregas.';
  appendMessage(greeting, 'bot');
}

function navigateToView(viewName) {
  const isDashboard = viewName === 'dashboard';
  const isClasses = viewName === 'classes';
  dashboardView.hidden = !isDashboard;
  classesView.hidden = !isClasses;
  workspace.hidden = isDashboard || isClasses;
  document.body.classList.toggle('dashboard-mode', isDashboard || isClasses);
  topbarPageLabel.textContent = isDashboard ? 'Dashboard' : isClasses ? 'Mis clases' : 'Agenda del curso';
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function openDashboardAgenda() {
  navigateToView('agenda');
}

function openClassesView() {
  navigateToView('classes');
}

function openDashboardChat() {
  navigateToView('agenda');
  chatInput.focus();
}

function initialize() {
  try {
    const savedRole = localStorage.getItem(ROLE_KEY);
    if (['Estudiante', 'Docente', 'Delegado/a'].includes(savedRole)) roleSelect.value = savedRole;
  } catch (error) {
    console.warn('No se pudo leer el rol guardado.', error);
  }

  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
  document.querySelector('#dashboard-date').textContent = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => navigateToView(button.dataset.view));
  });
  document.querySelector('.app-sidebar .brand').addEventListener('click', (clickEvent) => {
    clickEvent.preventDefault();
    openDashboardAgenda();
  });
  document.querySelector('#dashboard-new-event').addEventListener('click', () => {
    openDashboardAgenda();
    openCreateDialog();
  });
  document.querySelector('#dashboard-banner-action').addEventListener('click', () => {
    openDashboardAgenda();
    openCreateDialog();
  });
  document.querySelector('#dashboard-open-chat').addEventListener('click', openDashboardChat);
  document.querySelector('#dashboard-banner-agenda').addEventListener('click', openDashboardAgenda);
  document.querySelector('#dashboard-resources-agenda').addEventListener('click', openDashboardAgenda);
  document.querySelector('#resource-agenda').addEventListener('click', openDashboardAgenda);
  document.querySelector('#resource-chat').addEventListener('click', openDashboardChat);
  document.querySelector('#resource-classes').addEventListener('click', openClassesView);
  document.querySelector('#open-class-dialog').addEventListener('click', openCreateClassDialog);
  document.querySelector('#close-class-dialog').addEventListener('click', () => classDialog.close());
  document.querySelector('#cancel-class-dialog').addEventListener('click', () => classDialog.close());
  classForm.addEventListener('submit', handleClassSubmit);
  classGrid.addEventListener('click', handleClassAction);
  document.querySelector('#open-dialog').addEventListener('click', openCreateDialog);
  document.querySelector('#close-dialog').addEventListener('click', () => eventDialog.close());
  document.querySelector('#cancel-dialog').addEventListener('click', () => eventDialog.close());
  eventForm.addEventListener('submit', handleEventSubmit);
  eventGrid.addEventListener('click', handleEventAction);
  chatForm.addEventListener('submit', handleChatSubmit);
  emojiToggle.addEventListener('click', () => {
    setEmojiPickerOpen(emojiPicker.hidden);
  });
  emojiPicker.addEventListener('click', (clickEvent) => {
    const button = clickEvent.target.closest('button');
    if (button) insertEmoji(button);
  });
  chatComposer.addEventListener('keydown', (keyEvent) => {
    if (keyEvent.key === 'Escape') {
      setEmojiPickerOpen(false);
      emojiToggle.focus();
    }
  });
  chatInput.addEventListener('input', () => {
    emojiStatus.textContent = '';
  });
  document.addEventListener('click', (clickEvent) => {
    if (!clickEvent.target.closest('.chat-composer')) setEmojiPickerOpen(false);
  });
  roleSelect.addEventListener('change', () => {
    updateAuthorPreview();
    try { localStorage.setItem(ROLE_KEY, roleSelect.value); } catch (error) { console.warn('No se pudo guardar el rol.', error); }
  });
  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((filterButton) => {
        const selected = filterButton === button;
        filterButton.classList.toggle('is-active', selected);
        filterButton.setAttribute('aria-pressed', String(selected));
      });
      renderEvents();
    });
  });
  document.querySelectorAll('.chat-prompts button').forEach((button) => {
    button.addEventListener('click', () => {
      chatInput.value = button.dataset.prompt;
      chatForm.requestSubmit();
    });
  });

  renderEvents();
  renderClasses();
  addChatGreeting();
}

initialize();