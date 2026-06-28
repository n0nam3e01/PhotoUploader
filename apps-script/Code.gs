/**
 * =========================================================================
 *  Google Apps Script — приёмник фотографий для сайта сбора фото.
 *  Принимает POST-запрос с одним изображением (имя, MIME-тип, base64),
 *  декодирует его и сохраняет в указанную папку Google Drive.
 *
 *  Как развернуть — см. README.md (раздел «Развёртывание Apps Script»).
 * =========================================================================
 */

// ID папки Google Drive «Project» (найден через коннектор — фото будут падать сюда).
// Если захотите другую папку — ID берётся из адреса: https://drive.google.com/drive/folders/ЭТА_ЧАСТЬ
var FOLDER_ID = '1ddxv-RCAkbDnbmYTKpjH5D3QBNc2FTq2';


/**
 * Обрабатывает POST-запрос от сайта.
 * Тело приходит как JSON-строка в e.postData.contents.
 */
function doPost(e) {
  try {
    // Разобрать JSON, присланный сайтом
    var payload = JSON.parse(e.postData.contents);

    if (!payload.data) {
      return jsonResponse({ status: 'error', message: 'Нет данных изображения' });
    }

    // base64 -> байты -> Blob
    var bytes = Utilities.base64Decode(payload.data);
    var mimeType = payload.mimeType || 'application/octet-stream';

    // Имя файла с меткой времени, чтобы не было одинаковых имён
    var stamp = Utilities.formatDate(new Date(), 'GMT', 'yyyyMMdd-HHmmss');
    var safeName = (payload.filename || 'photo').replace(/[\\/:*?"<>|]/g, '_');
    var fileName = stamp + '_' + safeName;

    var blob = Utilities.newBlob(bytes, mimeType, fileName);

    // Сохранить в указанную папку
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var file = folder.createFile(blob);

    return jsonResponse({
      status: 'success',
      fileId: file.getId(),
      name: file.getName()
    });

  } catch (err) {
    // Ошибку видно в логах Apps Script (Executions) и в ответе сайту
    return jsonResponse({ status: 'error', message: String(err) });
  }
}

/**
 * Открытие URL в браузере (GET) — простая проверка, что веб-приложение живо.
 */
function doGet() {
  return jsonResponse({ status: 'ok', message: 'Photo upload endpoint is running.' });
}

/**
 * Вспомогательная функция: вернуть JSON-ответ.
 */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
