const { logInfo, logError } = require('./utils/logger');
const { generateHaikuWithRetry } = require('./utils/gemini');
const { GEMINI_PROMPT } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment-timezone');
const botConfig = require('./config');
const User = require('./models/User');
const { connectDB } = require('./utils/database');
const { safeSendMessage, initMessenger, broadcastToUsers, isAdmin } = require('./utils/messenger'); // Import broadcastToUsers and isAdmin
//const quickTips = 'Use /settimezone to choose your timezone and /settime HH:MM to set notification time. For now you have to type the full command for time. For example "/settime 08:30". I know this sucks :).  \n\nSend /unregister if you don\'t want to receive messages anymore.';
const quickTips = 'Используй команду /settimezone для выбора часового пояса уведомления. Команда /settime поможет настроить время уведомлений.\n\nКоманда /unregister отключит уведомления и бот про тебя забудет.';


const bot = new TelegramBot(botConfig.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize the messenger with the bot instance
initMessenger(bot);


// Helper function to check if user is registered
async function ensureRegistered(msg) {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramId: chatId.toString() });
    if (!user) {
      safeSendMessage(chatId, 'Пожалуйста используй /start, чтобы запустить бота.');
      return null;
    }
    return user;
  } catch (error) {
    logError(`Error fetching user ${chatId}:`, error);
    safeSendMessage(chatId, 'Произошла ошибка при проверке регистрации.');
    return null;
  }
}

// Registration command
// Handle inline keyboard callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const user = await ensureRegistered(query.message);
  if (!user) {
    return;
  }

  const data = query.data;

  if (data.startsWith('tz ')) {
    const tz = data.split(' ')[1];
    if (!moment.tz.zone(tz)) {
      bot.answerCallbackQuery(query.id, { text: 'Неизвестный часовой пояс!' });
      return;
    }

    try {
      await User.findOneAndUpdate(
        { telegramId: chatId.toString() },
        { timeZone: tz, pendingTimezone: false }
      );
      safeSendMessage(chatId, `Установлен часовой пояс ${tz}.`);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      logError('Timezone update error:', error);
      safeSendMessage(chatId, 'Произошла ошибка при обновлении часового пояса.');
    }
  } else if (data === 'tz_manual') {
    safeSendMessage(chatId, 'Отправь часовой пояс в формате Region/City (например, America/New_York, https://timeapi.io/documentation/iana-timezones):');
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
  } else if (data.startsWith('time_hour_')) {
    try {
      const hour = parseInt(data.split('_')[2]);
      await handleHourSelection(chatId, hour);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      logError('Hour selection error:', error);
      safeSendMessage(chatId, 'Произошла ошибка при выборе часа.');
    }
  } else if (data.startsWith('time_minute_')) {
    try {
      const minute = data.split('_')[2];
      await handleMinuteSelection(chatId, minute);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      logError('Minute selection error:', error);
      safeSendMessage(chatId, 'Произошла ошибка при выборе минут.');
    }
  } else if (data === 'toggle_haiku') {
    try {
      await handleHaikuToggle(chatId, user);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      logError('Haiku toggle error:', error);
      safeSendMessage(chatId, 'Произошла ошибка при настройке хайку.');
    }
  } else if (data === 'toggle_dessert') {
    const newState = !user.dessertSettings?.enabled;
    await updateDessertSettings(chatId, {
      ...user.dessertSettings,
      enabled: newState
    });
  } else if (data.startsWith('prob_')) {
    const probability = parseInt(data.split('_')[1]);
    await updateDessertSettings(chatId, {
      ...user.dessertSettings,
      probability
    });
  } else if (data === 'close_dessert') {
    try {
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      logError('Close dessert keyboard error:', error);
      safeSendMessage(chatId, 'Произошла ошибка при закрытии меню.');
    }
  }
});


async function handleStart(msg, chatId) {
  try {
    let existingUser = await User.findOne({ telegramId: chatId.toString() });
    logInfo(`Processing /start for user: ${msg.from.username} (${chatId.toString()})`);

    if (existingUser) {
      safeSendMessage(chatId, 'Ты уже зарегистрирован! 👍');
      return;
    }

    existingUser = new User({
      telegramId: chatId.toString(),
      username: msg.from.username
    });
    await existingUser.save();

    safeSendMessage(chatId, 'Привет! ' + quickTips);
  } catch (error) {
    logError('Registration error:', error);
    safeSendMessage(chatId, 'Ошибка регистрации');
  }
}

async function handleUnregister(chatId, user) {
  try {
    const result = await User.deleteOne({ telegramId: chatId.toString() });
    if (result.deletedCount > 0) {
        safeSendMessage(chatId, 'Бот забыл про тебя. Пока! 👋');
    } else {
        safeSendMessage(chatId, 'Ты не зарегистрирован в боте. Используй /start, чтобы начать использовать бот.');
    }
  } catch (error) {
    logError('Unregister error:', error);
    safeSendMessage(chatId, 'Произошла ошибка при очистке регистрации.');
  }
}

async function handleSetTimezone(chatId, user) {
  User.findOneAndUpdate(
    { telegramId: chatId.toString() },
    { pendingTimezone: true }
  ).then(() => {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Лондон', callback_data: 'tz Europe/London' },
            { text: 'Москва', callback_data: 'tz Europe/Moscow' },
            { text: 'Дубай', callback_data: 'tz Asia/Dubai' }
          ],
          [
            { text: 'Нью-Йорк', callback_data: 'tz America/New_York' },
            { text: 'Чикаго', callback_data: 'tz America/Chicago' },
            { text: 'Лос Анджелес', callback_data: 'tz America/Los_Angeles' }
          ],
          [
            { text: 'Ручной ввод', callback_data: 'tz_manual' }
          ]
        ]
      }
    };
    safeSendMessage(chatId, 'Выбери часовой пояс:', keyboard);
  });
}

async function handleTimeSelectionStart(chatId, user) {
  try {
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { 
        pendingTimeUpdate: true,
        selectedHour: null
      }
    );

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '6ч', callback_data: 'time_hour_6' },
            { text: '7ч', callback_data: 'time_hour_7' },
            { text: '8ч', callback_data: 'time_hour_8' },
            { text: '9ч', callback_data: 'time_hour_9' }
          ],
          [
            { text: '10ч', callback_data: 'time_hour_10' },
            { text: '11ч', callback_data: 'time_hour_11' },
            { text: '12ч', callback_data: 'time_hour_12' },
            { text: '13ч', callback_data: 'time_hour_13' }
          ],
          [
            { text: '14ч', callback_data: 'time_hour_14' },
            { text: '15ч', callback_data: 'time_hour_15' },
            { text: '16ч', callback_data: 'time_hour_16' },
            { text: '17ч', callback_data: 'time_hour_17' }
          ]
        ]
      }
    };
    safeSendMessage(chatId, 'Настроить время проверки шанса на кофе. Время -- твоё местное\n\nВыбери час:', keyboard);
  } catch (error) {
    logError('Error starting time selection:', error);
    safeSendMessage(chatId, 'Произошла ошибка при настройке времени.');
  }
}

async function handleHourSelection(chatId, hour) {
  try {
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { selectedHour: hour }
    );

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '00м', callback_data: 'time_minute_00' },
            { text: '10м', callback_data: 'time_minute_10' },
            { text: '20м', callback_data: 'time_minute_20' }
          ],
          [
            { text: '30м', callback_data: 'time_minute_30' },
            { text: '40м', callback_data: 'time_minute_40' },
            { text: '50м', callback_data: 'time_minute_50' }
          ]
        ]
      }
    };
    safeSendMessage(chatId, 'Выбери минуты:', keyboard);
  } catch (error) {
    logError('Error handling hour selection:', error);
    safeSendMessage(chatId, 'Произошла ошибка при выборе часа.');
  }
}

async function handleMinuteSelection(chatId, minute) {
  try {
    const user = await User.findOne({ telegramId: chatId.toString() });
    if (!user || !user.selectedHour) {
      safeSendMessage(chatId, 'Произошла ошибка. Пожалуйста, начни настройку времени заново с помощью команды /settime.');
      return;
    }

    const time = `${user.selectedHour.toString().padStart(2, '0')}:${minute}`;
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { 
        notificationTime: time,
        pendingTimeUpdate: false,
        selectedHour: null
      }
    );

    safeSendMessage(chatId, `Время уведомления установлено на ${time}.`);
  } catch (error) {
    logError('Error handling minute selection:', error);
    safeSendMessage(chatId, 'Произошла ошибка при установке времени.');
  }
}

async function handleSetTime(chatId, user) {
  await handleTimeSelectionStart(chatId, user);
}

async function handleSendHaiku(chatId, user) {
  const currentState = user.sendHaiku === null ? true : user.sendHaiku;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: `Настройка сейчас: ${currentState ? '✅' : '❌'} Нажми, чтобы переключить`, callback_data: 'toggle_haiku' }]
      ]
    }
  };
  safeSendMessage(chatId, 'Настройка отправки выдуманного стишка вместе с кофейным поздравлением', keyboard);
}

async function handleHaikuToggle(chatId, user) {
  const newState = user.sendHaiku === null ? false : !user.sendHaiku;
  await User.findOneAndUpdate(
    { telegramId: chatId.toString() },
    { sendHaiku: newState }
  );
  safeSendMessage(chatId, `Присылать хайку ${newState ? '✅' : '❌'}`);
}

async function handleBroadcast(chatId, user, args) {
  if (!isAdmin(chatId.toString())) {
    safeSendMessage(chatId, 'Эта команда доступна только администраторам.');
    return;
  }

  const message = args.join(' ');
  if (!message.trim()) {
    safeSendMessage(chatId, 'Сообщение не может быть пустым.');
    return;
  }

  try {
    const successfulSends = await broadcastToUsers(message);
    safeSendMessage(chatId, `Сообщение успешно отправлено ${successfulSends} пользователям.`);
  } catch (error) {
    logError('Broadcast error:', error);
    safeSendMessage(chatId, 'Произошла ошибка при отправке сообщения.');
  }
}

async function handleUnknownCommand(chatId, user) {
  safeSendMessage(chatId, 'Неизвестная команда.\n\n' + quickTips);
}

async function handleNonCommandMessage(chatId, user) {
  safeSendMessage(chatId, 'Я не понимаю.\n\n' + quickTips);
}

async function handleSetCookie(chatId, user) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: `Десерт сейчас: ${user.dessertSettings?.enabled ? '✅' : '❌'}`, callback_data: 'toggle_dessert' }
        ],
        [
          { text: `${user.dessertSettings?.probability === 20 ? '✅ ' : ''}Шанс 20%`, callback_data: 'prob_20' },
          { text: `${user.dessertSettings?.probability === 40 ? '✅ ' : ''}Шанс 40%`, callback_data: 'prob_40' },
          { text: `${user.dessertSettings?.probability === 60 ? '✅ ' : ''}Шанс 60%`, callback_data: 'prob_60' },
          { text: `${user.dessertSettings?.probability === 80 ? '✅ ' : ''}Шанс 80%`, callback_data: 'prob_80' }
        ],
        [
          { text: 'Закрыть', callback_data: 'close_dessert' }
        ]
      ]
    }
  };
  safeSendMessage(chatId, '🍪 Настройка десерта к кофе', keyboard);
}

async function updateDessertSettings(chatId, update) {
  try {
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { $set: { dessertSettings: update } }
    );
    const updatedUser = await User.findOne({ telegramId: chatId.toString() });
    if (!updatedUser) {
      throw new Error('User not found after update');
    }
    await handleSetCookie(chatId, updatedUser);
  } catch (error) {
    logError('Dessert settings update error:', error);
    safeSendMessage(chatId, 'Произошла ошибка при настройке десерта.');
  }
}

// Handle all incoming messages and commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // avoiding system messages like 'user xyz was added' etc
  if(text) {
    // Handle start command
    if (text.toLocaleLowerCase() === '/start') {
      await handleStart(msg, chatId);
      return;
    } // Stop processing if handling start command

    // All other commands require user to be registered with bot
    const user = await ensureRegistered(msg);
    if (!user) return;

    // Handle manual timezone input if pending
    if (user.pendingTimezone) {
      if (moment.tz.zone(text)) {
        await User.findOneAndUpdate(
          { telegramId: chatId.toString() },
          { timeZone: text, pendingTimezone: false }
        );
        safeSendMessage(chatId, `Установлен часовой пояс ${text}.`);
      } else {
        safeSendMessage(chatId, 'Неизвестный часовой пояс. Пожалуйста попробуй ещё раз или используй /settimezone для выбора часового пояса из списка.');
      }
      return; // Stop processing if handling pending timezone
    }

    // Handle commands
    if (text.startsWith('/')) {
      const [command, ...args] = text.slice(1).split(' ');
      const lowerCaseCommand = command.toLowerCase();

      switch (lowerCaseCommand) {
        case 'unregister':
          await handleUnregister(chatId, user);
          break;
        case 'settimezone':
          await handleSetTimezone(chatId, user);
          break;
        case 'settime':
          await handleSetTime(chatId, user);
          break;
        case 'sendhaiku':
          await handleSendHaiku(chatId, user);
          break;
        case 'setcookie':
          await handleSetCookie(chatId, user);
          break;
        case 'broadcast':
          await handleBroadcast(chatId, user, args);
          break;
        default:
          await handleUnknownCommand(chatId, user);
          break;
      }
    } else {
      await handleNonCommandMessage(chatId, user);
    }
  }
});

// Cron job to check every minute on working days
// todo: improve scalability
function setCronTask() {
  cron.schedule('* * * * 1-5', async () => {
    try {
      const users = await User.find();
      for (const user of users) {
        const now = moment().tz(user.timeZone);
        const [targetHour, targetMinute] = user.notificationTime.split(':');

        if (now.hours() === parseInt(targetHour) && now.minutes() === parseInt(targetMinute)) {
          const hasWon = Math.random() < 0.5;
          logInfo(`User ${user.username} rolled: ${hasWon}`);

          if (hasWon) {
            let messageToSend = botConfig.WIN_MESSAGE;
            
            // Check for dessert win if enabled
            if (user.dessertSettings?.enabled) {
              const dessertProbability = user.dessertSettings.probability / 100;
              const hasWonDessert = Math.random() < dessertProbability;
              if (hasWonDessert) {
                messageToSend += '\n\nНу и денёк 🌞! Тебе выпал ещё и десерт 🍰!';
              }
            }

            const shouldSendHaiku = user.sendHaiku === null ? true : user.sendHaiku;
            if (shouldSendHaiku) {
              let haiku = await generateHaikuWithRetry(
                GEMINI_PROMPT,
                botConfig.GEMINI_MODEL_NAME,
                botConfig.GEMINI_TEMPERATURE,
                botConfig.GEMINI_MAX_OUTPUT_TOKENS
              );
              messageToSend += '\n\n' + haiku;
            }

            try {
              await safeSendMessage(user.telegramId, messageToSend);
            } catch (error) {
              if ((error.response) && (error.response.statusCode === 403)) {
                // User has blocked the bot, delete them from the database
                await User.deleteOne({ telegramId: user.telegramId });
                logInfo(`User ${user.username} (${user.telegramId}) was blocked and unregistered.`);
              } else {
                logError(`Error sending message to ${user.telegramId}:`, error.message);
              }
            }
          }
        }
      }
    } catch (error) {
      logError('Cron error:', error);
    }
  }, {
    timezone: 'Etc/UTC'
  });
}

async function setupBotCommands() {
  try {
    await bot.setMyCommands([
      { command: 'start', description: 'Запустить бота' },
      { command: 'settime', description: 'Настроить время проверки шанса на кофе' },
      { command: 'settimezone', description: 'Настроить часовой пояс' },
      { command: 'sendhaiku', description: 'Настроить отправку хайку' },
      { command: 'setcookie', description: 'Десерт к кофе' },
      { command: 'unregister', description: 'Отключить уведомления' }
    ]);
    logInfo('Bot commands set up successfully');
  } catch (error) {
    logError('Error setting up bot commands:', error);
  }
}

async function main() {
  await connectDB();

  try {
    await require('./utils/migrations')();
  } catch (error) {
    logError('Migration failed:', error);
    process.exit(1);
  }

  await setupBotCommands();
  setCronTask();

  bot.on('error', (error) => {
    logError('Bot error:', error);
  });
}

main();

module.exports = bot;
