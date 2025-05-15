const { logInfo, logError } = require('./utils/logger');
const { generateHaikuWithRetry } = require('./utils/gemini');
const { GEMINI_PROMPT } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment-timezone');
const botConfig = require('./config');
const User = require('./models/User');
const { connectDB } = require('./utils/database');
const { safeSendMessage } = require('./utils/messenger'); // Import safeSendMessage
//const quickTips = 'Use /settimezone to choose your timezone and /settime HH:MM to set notification time. For now you have to type the full command for time. For example "/settime 08:30". I know this sucks :).  \n\nSend /unregister if you don\'t want to receive messages anymore.';
const quickTips = 'Используй команду /settimezone для выбора часового пояса уведомления. Набери команду /settime ЧЧ:ММ для настройки времени уведомлений. Пока что бот понимает только команду, написанную руками, например "/settime 08:30".  \n\nКоманда /unregister отключит уведомления и бот про тебя забудет.';


const bot = new TelegramBot(botConfig.TELEGRAM_BOT_TOKEN, { polling: true });


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
  logInfo(`Handling callback_query. Message ID: ${query.message.message_id}`);
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
    }
  } else if (data === 'tz_manual') {
    safeSendMessage(chatId, 'Отправь часовой пояс в формате Region/City (например, America/New_York, https://timeapi.io/documentation/iana-timezones):');
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });

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

async function handleSetTime(chatId, user, args) {
  const time = args[0];
  if (!time || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    safeSendMessage(chatId, 'Неверный формат. Используй ЧЧ:ММ, например 09:00');
    return;
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { notificationTime: time }
    );
    safeSendMessage(chatId, `Время уведомления установлено на ${time}.`);
  } catch (error) {
    logError('Time update error:', error);
    safeSendMessage(chatId, 'Ошибка установки времени уведомления.');
  }
}

async function handleUnknownCommand(chatId, user) {
  safeSendMessage(chatId, 'Неизвестная команда.\n\n' + quickTips);
}

async function handleNonCommandMessage(chatId, user) {
  safeSendMessage(chatId, 'Я не понимаю.\n\n' + quickTips);
}

// Handle all incoming messages and commands
bot.on('message', async (msg) => {
  logInfo(`Handling message. Message ID: ${msg.message_id}`);
  const chatId = msg.chat.id;
  const text = msg.text;

  // Handle start command
  if (text.toLocaleLowerCase() === '/start') {
    await handleStart(msg, chatId);
    return;
  } // Stop processing if handling start command

  // All other commnads require user to be regisgtered with bot
  const user = await ensureRegistered(msg);

  // Handle manual timezone input if pending
  if (user && user.pendingTimezone) {
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
        // Re-implement unregister logic
        if (!user) break;

        await handleUnregister(chatId, user);
        break;
      case 'settimezone':
        // Re-implement settimezone logic
        if (!user) break;

        await handleSetTimezone(chatId, user);
        break;
      case 'settime':
        // Re-implement settime logic
        if (!user) break;

        const time = args[0];
        if (!time || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
          safeSendMessage(chatId, 'Неверный формат. Используй ЧЧ:ММ, например 09:00');
          return;
        }

        await handleSetTime(chatId, user, args);
        break;
      default:
        // Unknown command
        if (!user) return;
        await handleUnknownCommand(chatId, user);
        break;
    }
  } else {
    // Handle non-command messages
    if (!user) return;
    await handleNonCommandMessage(chatId, user);
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
            let haiku = await generateHaikuWithRetry(
              GEMINI_PROMPT,
              botConfig.GEMINI_TEMPERATURE,
              botConfig.GEMINI_MAX_OUTPUT_TOKENS
            );

            let messageToSend;
            if (haiku) {
              messageToSend = `Поздравляю! Тебе выпало кофечко сегодня! 🎉\n\n${haiku}`;
              logInfo(`Sent haiku to user ${user.username} (${user.telegramId}): ${haiku}`);
            } else {
              messageToSend = botConfig.WIN_MESSAGE;
              logInfo(`Failed to generate haiku for user ${user.username} (${user.telegramId}). Sending standard message.`);
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

async function main() {
  await connectDB();

  try {
    await require('./utils/migrations')();
  } catch (error) {
    logError('Migration failed:', error);
    process.exit(1);
  }

  setCronTask();

  bot.on('error', (error) => {
    logError('Bot error:', error);
  });
}

main();
