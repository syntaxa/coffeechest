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

// Registration command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    let user = await User.findOne({ telegramId: chatId.toString() });
    console.log(getTS() + " Processing /start for user: " + msg.from.username + "("  + chatId.toString() +")");

    if (user) {
      bot.sendMessage(chatId, 'Ты уже зарегистрирован! 👍');
      return;
    }

    user = new User({
      telegramId: chatId.toString(),
      username: msg.from.username
    });
    await user.save();
    
    bot.sendMessage(chatId, 'Привет! ' + quickTips);
  } catch (error) {
    console.error(getTS() + ' Registration error:', error);
    bot.sendMessage(chatId, 'Ошибка регистрации');
  }
});

bot.onText(/\/unregister/, async (msg) => {
    const chatId = msg.chat.id;
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
});

// Timezone setting command with inline keyboard
bot.onText(/\/settimezone/, (msg) => {
  const chatId = msg.chat.id;
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
});

// Time setting command
bot.onText(/\/settime (\d{2}:\d{2})/, async (msg, match) => {
  const chatId = msg.chat.id;
  const time = match[1];
  
  if (!/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
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
});

// Handle inline keyboard callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
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

// Handle manual timezone input
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/')) return;

  const user = await User.findOne({ telegramId: chatId.toString() });

  if (!user) {
    bot.sendMessage(chatId, 'Привет! Пожалуйста используй /start, чтобы запустить бота.');
    return;
  }

  if (user.pendingTimezone) {
    if (moment.tz.zone(text)) {
      await User.findOneAndUpdate(
        { telegramId: chatId.toString() },
        { timeZone: text, pendingTimezone: false }
      );
      bot.sendMessage(chatId, `Установлен часовой пояс ${text}.`);
    } else {
      bot.sendMessage(chatId, 'Неизвестный часовой пояс. Пожалуйста попробуй ещё раз или используй /settimezone для выбора часового пояса из списка.');
    }
  } else {
    bot.sendMessage(chatId, quickTips);
  }
});

// Cron job to check every minute on working days
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
            try {
              await bot.sendMessage(user.telegramId, botConfig.WIN_MESSAGE);
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
