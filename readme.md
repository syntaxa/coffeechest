# Daily Telegram Coffee Lottery Bot

This Telegram bot brings excitement to your daily coffee routine by simulating a lottery. Every weekday (Monday to Friday) at a scheduled time, the bot randomly determines if you've won. If you're lucky, you'll receive a congratulatory message! More details in blog: https://t.me/OccupyCheetay/200

## Features

- **User Registration**: Users can register with the bot using the `/start` command.
- **Unregister**: Users can unregister from the bot using the `/unregister` command.
- **Set Timezone**: Users can set their timezone using the `/settimezone` command with an inline keyboard or manual input.
- **Set Notification Time**: Users can set their notification time using the `/settime HH:MM` command.
- **Daily Lottery**: The bot runs a daily lottery and notifies winners. The lottery is a random number generator that determines whether the user wins or loses.
- **Cron Job**: The bot checks every minute on working days to send notifications at the correct time. This cron job is scheduled to run every minute on weekdays (Monday to Friday).
- **Process heartbeat**: Optional HTTP GET to `HEARTBEAT_URL` every **5 minutes**, including weekends, to signal that the Node process is alive. This is separate from the weekday lottery cron (which does not run on Saturday–Sunday).
- **Admin Broadcast**: Administrators can broadcast messages to all users using the `/broadcast` command followed by the message text.


### Key Files

- **`bot.js`**: Main bot logic, including commands, inline keyboard handling, and cron job setup.
- **`config.js`**: Configuration file that loads environment variables.
- **`models/`**: Contains Mongoose schemas for `User` and `SchemaVersion`.
- **`utils/`**: Utility files for database connection, migrations, and Gemini API interaction.
- **`utils/llm.js`**: Contains functions for interacting with the configured LLM provider via OpenRouter to generate haikus.
- **`run.sh`**: Script to start the bot using PM2 for process management.
- **`runtest.sh`**: Script to start the bot in a potential test mode using PM2.

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Required variables
   TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
   MONGODB_URI=<your-mongodb-uri>
   LLM_API_KEY=<your-openrouter-api-key>
   ADMIN_CHAT_ID=<your-telegram-chat-id>  # Your Telegram chat ID with the bot for admin privileges and test-mode delivery

   # Environment configuration
   ENVIRONMENT=PROD  # Set to 'PROD' for production or 'TEST' for testing

   # Default settings
   SCHEDULED_TIME=9:50  # Default notification time
   TIMEZONE=Europe/Moscow  # Default timezone
   WIN_MESSAGE=Поздравляю! Тебе выпало кофечко сегодня! 🎉

   # LLM provider configuration
   LLM_API_URL=https://openrouter.ai/api/v1/chat/completions  # Default OpenRouter chat completions endpoint
   LLM_MODEL_NAME=google/gemini-3-flash-preview  # Default model
   LLM_TEMPERATURE=1.8  # Default is 1.8
   LLM_MAX_OUTPUT_TOKENS=300  # Default is 300
   LLM_PROMPT="Придумай две темы, связанные с природой. Напиши хайку на русском языке в классическом стиле, с образной, метафорической связностью, без юмора. Главная тема это кофе, но также добавь к контексту темы, придуманные ранее. Хайку должно отражать атмосферу спокойствия, тепла и утреннего настроения, как в традиционной японской поэзии. Обязательно затронь тему кофе. в ответе не должно быть тем, а должно быть только текст хайку. очень важно: проверь ответ и убери из него список тем, заголовок и всё, что не является текстом хайку. ответь с текстом только одного хайку."

   # Optional process heartbeat
   HEARTBEAT_URL=<url>  # GET every 5 min (7 days/week) with query param status=ok; omit to disable
   ```
ENVIRONMENT=TEST enables the following behaviour:
* messages are sent via telegram to admin user only
* no heartbeats are sent to external monitoring service
* bot schedule becomes daily instead of working days
* admin user is checked on every cron tick and always wins coffee, so test runs do not depend on time matching or random chance

4. Start the bot:
   ```bash
   npm start
   ```

## Commands

- **`/start`**: Register with the bot.
- **`/unregister`**: Unregister from the bot.
- **`/settimezone`**: Set your timezone using an inline keyboard or manual input.
- **`/settime HH:MM`**: Set your notification time in `HH:MM` format.
- **`/broadcast <message>`**: (Admin only) Broadcast a message to all registered users.

## Environment Variables in `config.js`

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
- `MONGODB_URI`: MongoDB connection string.
- `SCHEDULED_TIME`: Default notification time (optional).
- `TIMEZONE`: Default timezone (optional).
- `WIN_MESSAGE`: Custom message displayed to lottery winners (optional).
- `LLM_API_KEY`: Your OpenRouter API key.
- `LLM_API_URL`: Chat completions endpoint for the configured provider (optional, defaults to OpenRouter).
- `LLM_MODEL_NAME`: The model or router name to use (optional, defaults to `google/gemini-3-flash-preview`).
- `LLM_TEMPERATURE`: Controls the randomness of the output (optional, defaults to 1.8).
- `LLM_MAX_OUTPUT_TOKENS`: The maximum number of tokens to generate (optional, defaults to 300).
- `LLM_PROMPT`: The prompt used to generate haikus (optional, provides a default prompt).
- `ENVIRONMENT`: Set to 'PROD' for production or 'TEST' for testing mode.
- `ADMIN_CHAT_ID`: Your Telegram chat ID for admin privileges and as the only message recipient in `TEST` mode.
- `HEARTBEAT_URL` (optional): If set (and not in `TEST` mode), the bot issues a non-blocking HTTPS GET to this URL every **5 minutes**, including weekends, with `status=ok` appended as a query parameter. Use this for external uptime monitoring (e.g. Healthchecks.io). It reflects process liveness only, not whether the lottery cron ran.

### Test Mode

When `ENVIRONMENT` is set to 'TEST', the bot operates in a special test mode that:
- Only sends messages to the chat specified in `ADMIN_CHAT_ID`
- Suppresses all messages to other users
- Logs information about message suppression
- Provides detailed error logging for testing purposes

This mode is useful for testing new features or changes without affecting all users. In test mode, the bot will only interact with the admin chat, making it safe to experiment with new functionality.

## LLM Integration

This bot integrates with an LLM provider through OpenRouter to generate coffee haikus, which may be included in the winning message.

## Dependencies

- [dotenv](https://www.npmjs.com/package/dotenv): For loading environment variables.
- [mongoose](https://www.npmjs.com/package/mongoose): For MongoDB object modeling.
- [node-telegram-bot-api](https://www.npmjs.com/package/node-telegram-bot-api): For interacting with the Telegram Bot API.
- [node-cron](https://www.npmjs.com/package/node-cron): For scheduling tasks.
- [moment-timezone](https://www.npmjs.com/package/moment-timezone): For timezone handling.

## Database Migrations

The bot includes a migration system to update the database schema. Migrations are defined in `utils/migrations.js` and are applied automatically when the bot starts.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Feel free to submit issues or pull requests to improve the bot: https://github.com/syntaxa/coffeechest
