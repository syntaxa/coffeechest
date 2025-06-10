# Daily Telegram Coffee Lottery Bot

This Telegram bot brings excitement to your daily coffee routine by simulating a lottery. Every weekday (Monday to Friday) at a scheduled time, the bot randomly determines if you've won. If you're lucky, you'll receive a congratulatory message! More details in blog: https://t.me/OccupyCheetay/200

## Features

- **User Registration**: Users can register with the bot using the `/start` command.
- **Unregister**: Users can unregister from the bot using the `/unregister` command.
- **Set Timezone**: Users can set their timezone using the `/settimezone` command with an inline keyboard or manual input.
- **Set Notification Time**: Users can set their notification time using the `/settime HH:MM` command.
- **Daily Lottery**: The bot runs a daily lottery and notifies winners. The lottery is a random number generator that determines whether the user wins or loses.
- **Cron Job**: The bot checks every minute on working days to send notifications at the correct time. This cron job is scheduled to run every minute on weekdays (Monday to Friday).
- **Admin Broadcast**: Administrators can broadcast messages to all users using the `/broadcast` command followed by the message text.


### Key Files

- **`bot.js`**: Main bot logic, including commands, inline keyboard handling, and cron job setup.
- **`config.js`**: Configuration file that loads environment variables.
- **`models/`**: Contains Mongoose schemas for `User` and `SchemaVersion`.
- **`utils/`**: Utility files for database connection, migrations, and Gemini API interaction.
- **`utils/gemini.js`**: Contains functions for interacting with the Google Gemini API to generate haikus.
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
   GEMINI_API_KEY=<your-gemini-api-key>
   ADMIN_USER_ID=<your-telegram-user-id>  # Your Telegram user ID for admin privileges

   # Environment configuration
   ENVIRONMENT=PROD  # Set to 'PROD' for production or 'TEST' for testing

   # Default settings
   SCHEDULED_TIME=9:50  # Default notification time
   TIMEZONE=Europe/Moscow  # Default timezone

   # Gemini API configuration (all optional)
   GEMINI_MODEL_NAME=gemini-2.0-flash  # Default is 'gemini-2.0-flash'
   GEMINI_TEMPERATURE=1.5  # Default is 1.5
   GEMINI_MAX_OUTPUT_TOKENS=300  # Default is 300
   GEMINI_PROMPT="придумай три темы для стихов. придумай один стих в стиле хайку про кофе с тонким юмором и используй придуманные ранее темы для вдохновения. ответ должен содержать только текст хайку. убери темы из результата."  # Default prompt
   ```

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
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `GEMINI_MODEL_NAME`: The name of the Gemini model to use (optional, defaults to `gemini-2.0-flash`).
- `GEMINI_TEMPERATURE`: Controls the randomness of the output (optional, defaults to 1.5).
- `GEMINI_MAX_OUTPUT_TOKENS`: The maximum number of tokens to generate (optional, defaults to 300).
- `GEMINI_PROMPT`: The prompt used to generate haikus (optional, provides a default prompt).
- `ENVIRONMENT`: Set to 'PROD' for production or 'TEST' for testing mode.
- `TESTING_USER_ID`: Telegram ID of the user who will receive messages in test mode.
- `ADMIN_USER_ID`: Your Telegram user ID for admin privileges.

### Test Mode

When `ENVIRONMENT` is set to 'TEST', the bot operates in a special test mode that:
- Only sends messages to the user specified in `TESTING_USER_ID`
- Suppresses all messages to other users
- Logs information about message suppression
- Provides detailed error logging for testing purposes

This mode is useful for testing new features or changes without affecting all users. In test mode, the bot will only interact with the designated testing user, making it safe to experiment with new functionality.

## Gemini API Integration

This bot integrates with the Google Gemini API to generate humorous haikus about coffee, which may be included in the winning message.

## Dependencies

- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai): For interacting with the Google Gemini API.
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
