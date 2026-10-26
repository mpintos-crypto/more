const STORAGE_KEY = 'entreclase.events.v1';
const ROLE_KEY = 'entreclase.role.v1';

const eventGrid = document.querySelector('#event-grid');
const eventDialog = document.querySelector('#event-dialog');
const eventForm = document.querySelector('#event-form');
const chatMessages = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const roleSelect = document.querySelector('#role-select');
const eventTypeLabels = {
  examen: { label: 'Examen', icon: '✎' },
  aviso: { label: 'Aviso docente', icon: '◉' },
  entrega: { label: 'Entrega', icon: '✓' }
};

let events = loadEvents();
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

function handleChatSubmit(submitEvent) {
  submitEvent.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
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

function initialize() {
  try {
    const savedRole = localStorage.getItem(ROLE_KEY);
    if (['Estudiante', 'Docente', 'Delegado/a'].includes(savedRole)) roleSelect.value = savedRole;
  } catch (error) {
    console.warn('No se pudo leer el rol guardado.', error);
  }

  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
  document.querySelector('#open-dialog').addEventListener('click', openCreateDialog);
  document.querySelector('#close-dialog').addEventListener('click', () => eventDialog.close());
  document.querySelector('#cancel-dialog').addEventListener('click', () => eventDialog.close());
  eventForm.addEventListener('submit', handleEventSubmit);
  eventGrid.addEventListener('click', handleEventAction);
  chatForm.addEventListener('submit', handleChatSubmit);
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
  addChatGreeting();
}

initialize();