/* =========================================================================
   Мемориальный сайт — логика страницы.
   Текст сразу на двух языках (русский / казахский), без переключателя.
   Всё короткое и крупное — чтобы было понятно любому.

   ЧТО ЗАПОЛНИТЬ:
     1) PERSON           — имя, годы жизни, портрет
     2) UPLOAD_ENDPOINT  — адрес Google Apps Script Web App
     3) FOLDER_ID         — задаётся в файле apps-script/Code.gs
   ========================================================================= */


/* ======================= 1. ДАННЫЕ О ЧЕЛОВЕКЕ ===========================
   Заполните имя, годы жизни и, при наличии, путь к фотографии-портрету.
   ======================================================================== */
const PERSON = {
  name: 'Нұрлана Болатқызы'   // ← заголовок на странице (имя)
};


/* ======================= 2. НАСТРОЙКА ЗАГРУЗКИ ==========================
   UPLOAD_ENDPOINT — URL развёрнутого Google Apps Script Web App.
   Как его получить — см. README.md. Пока стоит заглушка.
   ======================================================================== */
// >>>>> ВСТАВЬТЕ СЮДА АДРЕС ВАШЕГО APPS SCRIPT <<<<<
const UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzA18zmDU78mzKOi4GX-wjH28vSfvZ34ajJ5DBwVRoL54xSJjcZ1LgcSB-Fsfd_zuk4/exec';

// Ограничения на файлы
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];
const MAX_FILE_SIZE_MB = 15;           // максимальный размер одного файла, МБ
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;


/* ============================ 3. ТЕКСТЫ ================================
   Все надписи — короткие, сразу на двух языках через «/».
   Меняйте смело, всё в одном месте.
   ======================================================================== */
const TEXT = {
  appealText:   'Здравствуйте! Если у вас есть фотографии, пожалуйста, ' +
                'загрузите их здесь — это просто и займёт всего минуту. ' +
                'Будем очень благодарны. Спасибо! / ' +
                'Сәлеметсіз бе! Егер сізде фотосуреттер болса, оларды осында ' +
                'жүктеңіз — бұл оңай әрі бір-ақ минут уақыт алады. ' +
                'Сізге алғыс айтамыз. Рақмет!',
  count:        'Выбрано: {n} / Таңдалды: {n}',
  chooseBtn:    'Выбрать фото / Фото таңдау',
  formatsHint:  'До ' + MAX_FILE_SIZE_MB + ' МБ на фото / Фотоға ' + MAX_FILE_SIZE_MB + ' МБ дейін',
  submitBtn:    'Отправить / Жіберу',
  removeFile:   'Убрать / Алып тастау',

  statusUploading: 'Отправляем… / Жіберілуде…',

  thankYouTitle: 'Спасибо / Рақмет',
  thankYouText:  'Спасибо, что поделились. / Бөліскеніңізге рақмет.',
  addMoreBtn:    'Добавить ещё / Тағы қосу',

  errNoFiles:   'Выберите фото / Фото таңдаңыз',
  errType:      'Только фото / Тек фото',
  errSize:      'Файл слишком большой / Файл тым үлкен',
  errNetwork:   'Не получилось. Попробуйте ещё раз. / Болмады. Қайталап көріңіз.',
  errNotConfigured: 'Загрузка не настроена / Жүктеу бапталмаған',

  footerText:    'Спасибо за вашу помощь! / Көмегіңізге рақмет!',
  footerContact: ''   // напр. 'family@example.com' — или оставьте пустым
};


/* ============================================================================
   Ниже — рабочий код. Обычно его менять не нужно.
   ============================================================================ */

let selectedFiles = [];        // выбранные файлы, ожидающие отправки

// Короткие ссылки на элементы
const $ = (id) => document.getElementById(id);
const els = {
  name:       $('personName'),
  fileInput:  $('fileInput'),
  dropzone:   $('dropzone'),
  chooseBtn:  $('chooseBtn'),
  count:      $('count'),
  previews:   $('previews'),
  message:    $('message'),
  submitBtn:  $('submitBtn'),
  uploadSection: $('uploadSection'),
  thankyou:   $('thankyou'),
  addMoreBtn: $('addMoreBtn')
};

/* --- Подставить тексты в элементы с data-i18n --- */
function applyTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (TEXT[key] !== undefined) el.textContent = TEXT[key];
  });
  // Скрыть строку контакта, если она пустая
  const contact = document.querySelector('[data-i18n="footerContact"]');
  if (contact && !TEXT.footerContact) contact.style.display = 'none';
}

/* --- Подставить данные о человеке (имя, даты, портрет) --- */
function applyPerson() {
  els.name.textContent = PERSON.name;
}

/* --- Показать сообщение определённого типа --- */
function showMessage(text, type) {
  els.message.textContent = text || '';
  els.message.className = 'message' + (type ? ' is-' + type : '');
}

/* --- Проверка одного файла. Возвращает текст ошибки или null --- */
function validateFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
  if (!typeOk) return TEXT.errType;
  if (file.size > MAX_FILE_SIZE) return TEXT.errSize;
  return null;
}

/* --- Добавить выбранные файлы (с проверкой) --- */
function addFiles(fileList) {
  let firstError = null;
  for (const file of fileList) {
    const error = validateFile(file);
    if (error) { if (!firstError) firstError = error; continue; }
    // не добавлять дубликаты (по имени + размеру)
    const dup = selectedFiles.some((f) => f.name === file.name && f.size === file.size);
    if (!dup) selectedFiles.push(file);
  }
  renderPreviews();
  showMessage(firstError, firstError ? 'error' : null);
}

/* --- Отрисовать превью выбранных фото --- */
function renderPreviews() {
  els.previews.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const cell = document.createElement('div');
    cell.className = 'preview';
    cell.style.setProperty('--i', index); // для каскадного появления

    // HEIC/HEIF браузеры обычно не отрисовывают — показываем карточку с именем
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const renderable = !['heic', 'heif'].includes(ext);

    if (renderable) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(img.src); // освобождаем память
      cell.appendChild(img);
    } else {
      cell.innerHTML =
        '<div class="preview-file">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M8 13l2.5 3 3-4L18 18"/></svg>' +
        '<span>' + file.name + '</span></div>';
    }

    // Кнопка удаления
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preview-remove';
    remove.setAttribute('aria-label', TEXT.removeFile);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      selectedFiles.splice(index, 1);
      renderPreviews();
    });
    cell.appendChild(remove);

    els.previews.appendChild(cell);
  });

  // Счётчик выбранных фото
  if (selectedFiles.length > 0) {
    els.count.textContent = TEXT.count.replace(/\{n\}/g, selectedFiles.length);
    els.count.hidden = false;
  } else {
    els.count.hidden = true;
  }

  // Кнопка отправки активна только если что-то выбрано
  els.submitBtn.disabled = selectedFiles.length === 0;
}

/* --- Файл -> base64 (без префикса data:...) --- */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

/* --- Загрузить один файл на Apps Script ---
   Тело отправляется как text/plain (JSON-строка), чтобы избежать CORS-preflight
   запроса OPTIONS, который Apps Script не обрабатывает. */
async function uploadFile(file) {
  const base64 = await fileToBase64(file);
  const response = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: base64
    })
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const result = await response.json();
  if (result.status !== 'success') throw new Error(result.message || 'upload failed');
  return result;
}

/* --- Отправка всех выбранных файлов --- */
async function handleSubmit() {
  if (selectedFiles.length === 0) {
    showMessage(TEXT.errNoFiles, 'error');
    return;
  }
  // Защита от незаполненного эндпоинта
  if (UPLOAD_ENDPOINT.includes('PASTE_YOUR')) {
    showMessage(TEXT.errNotConfigured, 'error');
    return;
  }

  els.submitBtn.disabled = true;
  showMessage(TEXT.statusUploading, 'loading');

  try {
    // Отправляем по очереди, чтобы не перегружать Apps Script
    for (let i = 0; i < selectedFiles.length; i++) {
      await uploadFile(selectedFiles[i]);
    }
    // Успех — показываем благодарность
    selectedFiles = [];
    els.uploadSection.hidden = true;
    els.thankyou.hidden = false;
    els.thankyou.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    // Любая ошибка — понятное сообщение, файлы остаются для повторной отправки
    console.error('Ошибка загрузки:', err);
    showMessage(TEXT.errNetwork, 'error');
    els.submitBtn.disabled = false;
  }
}

/* --- Сброс формы для добавления новых фото --- */
function resetForm() {
  els.thankyou.hidden = true;
  els.uploadSection.hidden = false;
  renderPreviews();
  showMessage('', null);
  els.uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================ Слушатели событий ========================= */

// Выбор файлов кнопкой / кликом по зоне
els.chooseBtn.addEventListener('click', () => els.fileInput.click());
els.dropzone.addEventListener('click', (e) => {
  if (e.target === els.chooseBtn) return; // не открывать диалог дважды
  els.fileInput.click();
});
els.fileInput.addEventListener('change', (e) => {
  addFiles(e.target.files);
  els.fileInput.value = ''; // позволяет выбрать тот же файл повторно
});

// Drag-and-drop (удобно на компьютере)
['dragenter', 'dragover'].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add('is-dragover');
  })
);
['dragleave', 'drop'].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove('is-dragover');
  })
);
els.dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
});

// Отправка и «добавить ещё»
els.submitBtn.addEventListener('click', handleSubmit);
els.addMoreBtn.addEventListener('click', resetForm);

/* ============================== Инициализация =========================== */
applyTexts();
applyPerson();
