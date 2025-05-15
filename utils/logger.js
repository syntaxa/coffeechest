const timeStampOptions = {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

function getTS() {
  return new Date().toLocaleString('ru-RU', timeStampOptions);
}

function logInfo(message) {
  console.log(getTS() + ' ' + message);
}

function logError(message, error) {
  console.error(getTS() + ' ' + message, error);
}

module.exports = {
  logInfo,
  logError
};