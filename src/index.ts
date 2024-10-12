import { Hono } from 'hono'
import {TelegramUpdate, Bot} from "gramio";

const app = new Hono<{ Bindings: CloudflareBindings }>()
let  bot: Bot

app.post('/webhook', async (c) => {
  const update = await c.req.json<TelegramUpdate>()
  await bot.updates.handleUpdate(update)
  return c.text('Success')
})

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledController,bindings: CloudflareBindings,ctx: ExecutionContext): Promise<void> {
    const bot = getBot(bindings.BOT_TOKEN,bindings.DB)
    const db = bindings.DB

    const  { results}  = await db.prepare('SELECT telegram_id FROM users').all()
    results.forEach((result)=>{
      bot.api.sendMessage({
        chat_id: convertTelegramId(result['telegram_id']),
        text: "hello Hono!",
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            {
              text: "Report Work",
              web_app: {
                url: bindings.WORK_REPORTER_APP,
              }
            }
          ]]
        }
      })
    })
  }
}

function getBot(token:string,db: D1Database): Bot {
  if (bot == undefined) {
    bot = new Bot(token).on("message",async (ctx) => {
      const message = ctx.update?.message?.text
      const telegramId = ctx.update?.message?.chat.id
      const telegramName = ctx.update?.message?.chat.username

      console.log(`${telegramName} send a message. ID is ${telegramId}`)

      if (message?.startsWith("/")) {
        // command
        const command = message?.slice(1)
        console.log("get command: ", command)

        switch (command) {
          case "start":
            await db.prepare('INSERT OR IGNORE INTO users (telegram_id, telegram_name) VALUES (?, ?)').bind(telegramId, telegramName).run()
            break
        }

      } else {
        console.log("get common message: ", message)
      }
    })
  }
  return bot
}

function convertTelegramId(id: unknown): number|string {
  if (typeof id === 'number') {
    return id
  }
  if (typeof id === 'string') {
    return id
  }
  throw new Error(`Unexpected type of telegram id: ${typeof id}`)
}