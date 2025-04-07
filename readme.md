
# Daily Telegram Coffee Lottery Bot

This Telegram bot brings excitement to your daily coffee routine by simulating a lottery. Every weekday (Monday to Friday) at a scheduled time, the bot randomly determines if you've won. If you're lucky, you'll receive a congratulatory message! More details in blog: https://t.me/OccupyCheetay/200

## Features

- **User Registration**: Users can register with the bot using the `/start` command.
- **Unregister**: Users can unregister from the bot using the `/unregister` command.
- **Set Timezone**: Users can set their timezone using the `/settimezone` command with an inline keyboard or manual input.
- **Set Notification Time**: Users can set their notification time using the `/settime HH:MM` command.
- **Daily Lottery**: The bot runs a daily lottery and notifies winners. The lottery is a random number generator that determines whether the user wins or loses.
- **Cron Job**: The bot checks every minute on working days to send notifications at the correct time. This cron job is scheduled to run every minute on weekdays (Monday to Friday).

## Project Structure

```
.env
.gitignore
bot.js
config.js
package.json
models/
    SchemaVersion.js
    User.js
utils/
    database.js
    migrations.js
    package.json
```

### Key Files

- **`bot.js`**: Main bot logic, including commands, inline keyboard handling, and cron job setup.
- **`config.js`**: Configuration file that loads environment variables.
- **`models/`**: Contains Mongoose schemas for `User` and `SchemaVersion`.
- **`utils/`**: Utility files for database connection and migrations.

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
   TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
   MONGODB_URI=<your-mongodb-uri>
   SCHEDULED_TIME=9:50
   TIMEZONE=Europe/Moscow
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

## Environment Variables in `config.js`

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
- `MONGODB_URI`: MongoDB connection string.
- `SCHEDULED_TIME`: Default notification time (optional).
- `TIMEZONE`: Default timezone (optional).
- `WIN_MESSAGE`: Custom message displayed to lottery winners (optional).

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
