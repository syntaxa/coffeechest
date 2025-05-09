const { generateHaikuWithRetry } = require('./utils/gemini');
const { GEMINI_PROMPT } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment-timezone');
const botConfig = require('./config');
const User = require('./models/User');
const { connectDB } = require('./utils/database');
//const quickTips = 'Use /settimezone to choose your timezone and /settime HH:MM to set notification time. For now you have to type the full command for time. For example "/settime 08:30". I know this sucks :).  \n\nSend /unregister if you don\'t want to receive messages anymore.';
const quickTips = 'Используй команду /settimezone для выбора часового пояса уведомления. Набери команду /settime ЧЧ:ММ для настройки времени уведомлений. Пока что бот понимает только команду, написанную руками, например "/settime 08:30".  \n\nКоманда /unregister отключит уведомления и бот про тебя забудет.';

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

const bot = new TelegramBot(botConfig.TELEGRAM_BOT_TOKEN, { polling: true });

function getTS() {
  return new Date().toLocaleString('ru-RU', timeStampOptions);
}


// Helper function to check if user is registered
async function ensureRegistered(msg) {
  const chatId = msg.chat.id;
  try {
    const user = await User.findOne({ telegramId: chatId.toString() });
    if (!user) {
      bot.sendMessage(chatId, 'Пожалуйста используй /start, чтобы запустить бота.');
      return null;
    }
    return user;
  } catch (error) {
    console.error(getTS() + ` Error fetching user ${chatId}:`, error);
    bot.sendMessage(chatId, 'Произошла ошибка при проверке регистрации.');
    return null;
  }
}

// Registration command
// Handle inline keyboard callbacks
bot.on('callback_query', async (query) => {
  console.log(getTS() + ' Handling callback_query. Message ID:', query.message.message_id);
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
      bot.sendMessage(chatId, `Установлен часовой пояс ${tz}.`);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    } catch (error) {
      console.error(getTS() + ' Timezone update error:', error);
    }
  } else if (data === 'tz_manual') {
    bot.sendMessage(chatId, 'Отправь часовой пояс в формате Region/City (например, America/New_York, https://timeapi.io/documentation/iana-timezones):');
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });

  }
});


async function handleStart(msg, chatId) {
  try {
    let existingUser = await User.findOne({ telegramId: chatId.toString() });
    console.log(getTS() + " Processing /start for user: " + msg.from.username + "("  + chatId.toString() +")");

    if (existingUser) {
      bot.sendMessage(chatId, 'Ты уже зарегистрирован! 👍');
      return;
    }

    existingUser = new User({
      telegramId: chatId.toString(),
      username: msg.from.username
    });
    await existingUser.save();

    bot.sendMessage(chatId, 'Привет! ' + quickTips);
  } catch (error) {
    console.error(getTS() + ' Registration error:', error);
    bot.sendMessage(chatId, 'Ошибка регистрации');
  }
}

async function handleUnregister(chatId, user) {
  try {
    const result = await User.deleteOne({ telegramId: chatId.toString() });
    if (result.deletedCount > 0) {
        bot.sendMessage(chatId, 'Бот забыл про тебя. Пока! 👋');
    } else {
        bot.sendMessage(chatId, 'Ты не зарегистрирован в боте. Используй /start, чтобы начать использовать бот.');
    }
  } catch (error) {
    console.error(getTS() + ' Unregister error:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при очистке регистрации.');
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
    bot.sendMessage(chatId, 'Выбери часовой пояс:', keyboard);
  });
}

async function handleSetTime(chatId, user, args) {
  const time = args[0];
  if (!time || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    bot.sendMessage(chatId, 'Неверный формат. Используй ЧЧ:ММ, например 09:00');
    return;
  }

  try {
    await User.findOneAndUpdate(
      { telegramId: chatId.toString() },
      { notificationTime: time }
    );
    bot.sendMessage(chatId, `Время уведомления установлено на ${time}.`);
  } catch (error) {
    console.error(getTS() + ' Time update error:', error);
    bot.sendMessage(chatId, 'Ошибка установки времени уведомления.');
  }
}

async function handleUnknownCommand(chatId, user) {
  bot.sendMessage(chatId, 'Неизвестная команда.\n\n' + quickTips);
}

async function handleNonCommandMessage(chatId, user) {
  bot.sendMessage(chatId, 'Я не понимаю.\n\n' + quickTips);
}

// Handle all incoming messages and commands
bot.on('message', async (msg) => {
  console.log(getTS() + ' Handling message. Message ID:', msg.message_id);
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
      bot.sendMessage(chatId, `Установлен часовой пояс ${text}.`);
    } else {
      bot.sendMessage(chatId, 'Неизвестный часовой пояс. Пожалуйста попробуй ещё раз или используй /settimezone для выбора часового пояса из списка.');
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
          bot.sendMessage(chatId, 'Неверный формат. Используй ЧЧ:ММ, например 09:00');
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
          console.log(getTS() + ` User ${user.username} rolled: ${hasWon}`);

          if (hasWon) {
            let haiku = await generateHaikuWithRetry(
              GEMINI_PROMPT,
              botConfig.GEMINI_TEMPERATURE,
              botConfig.GEMINI_MAX_OUTPUT_TOKENS
            );

            let messageToSend;
            if (haiku) {
              messageToSend = `Поздравляю! Тебе выпало кофечко сегодня! 🎉\n\n${haiku}`;
              console.log(getTS() + ` Sent haiku to user ${user.username} (${user.telegramId}): ${haiku}`);
            } else {
              messageToSend = botConfig.WIN_MESSAGE;
              console.log(getTS() + ` Failed to generate haiku for user ${user.username} (${user.telegramId}). Sending standard message.`);
            }

            try {
              await bot.sendMessage(user.telegramId, messageToSend);
            } catch (error) {
              if ((error.response) && (error.response.statusCode === 403)) {
                // User has blocked the bot, delete them from the database
                await User.deleteOne({ telegramId: user.telegramId });
                console.log(getTS() + ` User ${user.username} (${user.telegramId}) was blocked and unregistered.`);
              } else {
                console.error(getTS() + ` Error sending message to ${user.telegramId}:`, error.message);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(getTS() + ' Cron error:', error);
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
    console.error(getTS() + ' Migration failed:', error);
    process.exit(1);
  }

  setCronTask();
  
  bot.on('error', (error) => {
    console.error(getTS() + ' Bot error:', error);
  });
}

main();
