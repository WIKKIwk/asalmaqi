# SHIFA ALEASAL — mustaqil joylash

Repository sayt kodi, o‘zbekcha/ruscha variantlar, dastlabki mahsulotlar va `public/assets/` rasmlarini saqlaydi. Maxfiy sozlamalar `.dev.vars` / `.env` fayllarida turadi va Git'ga kiritilmaydi. Kalit nomlari `.dev.vars.example` ichida bor.

## Muhit

- Node.js 22.13 yoki undan yangi versiya va npm.
- Hozirgi server qismi Cloudflare Workers, D1 (`DB`) va R2 (`BUCKET`) bilan ishlaydi. `app/` ichidagi server kodlari `cloudflare:workers` bindinglaridan foydalanadi.
- Oddiy statik hosting yoki standart Node.js serveriga joylash uchun katalog saqlash va rasm yuklash qismlarini o‘sha server muhitiga moslashtirish kerak. Quyidagi yo‘l o‘z Cloudflare hisobingizda, ChatGPT Sites'dan tashqarida ishlatish uchun.

## Kompyuterda ishga tushirish

```sh
npm ci
npm test
npm run build
```

`.dev.vars.example` dan `.dev.vars` nusxasini tayyorlab, kerakli qiymatlarni o‘zingiz kiriting. Keyin lokal bazaga migratsiyani qo‘llang:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wandering_sphinx.sql
npm start -- --port 4177
```

Manzil: `http://127.0.0.1:4177/`. Ruscha variant: `http://127.0.0.1:4177/?lang=ru`.

## O‘z Cloudflare hisobingizda

1. Hisobingizda Worker, D1 baza va R2 bucket tayyorlang.
2. `npm run build` dan keyin `dist/server/wrangler.json` ichidagi Worker nomi va `DB` / `BUCKET` resurslarini o‘z hisobingizdagilariga almashtiring. Baza ID'si hozir lokal preview uchun placeholder. Binding nomlari `DB` va `BUCKET` bo‘lib qoladi. Qayta build qilinganda yaratilgan konfiguratsiyani qayta tekshiring.
3. `drizzle/` migratsiyalarini o‘z bazangizga bir marta qo‘llang. Masalan:

```sh
npx wrangler login
npx wrangler d1 execute DB --remote --config dist/server/wrangler.json --file drizzle/0000_wandering_sphinx.sql
```

4. Quyidagi maxfiy qiymatlarni yangi Worker muhitiga kiriting:

```sh
npx wrangler secret put TELEGRAM_BOT_TOKEN --config dist/server/wrangler.json
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET --config dist/server/wrangler.json
npx wrangler secret put TELEGRAM_ADMIN_IDS --config dist/server/wrangler.json
```

`SITE_ORIGIN` ni yangi HTTPS manzilingizga sozlang. Uni Worker vars sozlamasiga kiriting. So‘ng o‘zingiz joylang:

```sh
npx wrangler deploy --config dist/server/wrangler.json
```

## Telegram boti va mavjud ma’lumotlar

Yangi server ishlagach, bot webhook manzilini yangi `https://<domen>/api/telegram/webhook` ga almashtiring. Webhook uchun `secret_token` yangi serverdagi `TELEGRAM_WEBHOOK_SECRET` bilan bir xil bo‘lishi kerak. Oddiy ko‘chirishda `drop_pending_updates` yoqmang.

Bot orqali keyinroq qo‘shilgan katalog yozuvlari va rasmlar production D1/R2 omborlarida saqlanadi. Ular Git repository ichiga avtomatik ko‘chmaydi. Mavjud katalogni saqlash uchun D1 ma’lumotlari va R2 obyektlarini alohida eksport/import qiling. Eksport bo‘lmasa, yangi baza `lib/catalog-seed.json` dagi dastlabki beshta mahsulot bilan boshlanadi.

GitHub'ga push qilish serverni o‘z-o‘zidan yangilamaydi. Avtomatik joylash sozlanmagan.
