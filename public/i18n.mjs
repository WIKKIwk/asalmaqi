const uz={
 catalog:'Asallar to‘plami',largePacks:'Katta qadoqlar',largeNote:'Sevimli asalingizdan ko‘proq.',
 details:'Batafsil ko‘rish',meetHoney:'Asal bilan tanishing',unavailable:'Hozircha mavjud emas',
 available:'Buyurtma uchun mavjud',askByPhone:'Telefon orqali aniqlang',
 slide:'slayd',carousel:'karusel',browse:'Asallarni varaqlang',swipe:'yon tomonga suring',
 previous:'oldingi asal',next:'keyingi asal',autoplayStart:'avtomatik aylanishni boshlash',autoplayStop:'avtomatik aylanishni to‘xtatish',
 about:'haqida',package:'qadoq',currency:'so‘m',
 empty:'To‘plam yangilanmoqda. Mavjud asallar haqida',call:'qo‘ng‘iroq qilib bilib oling',
 language:'Sayt tili'
};
const ru={
 catalog:'Коллекция мёда',largePacks:'Большие упаковки',largeNote:'Больше вашего любимого мёда.',
 details:'Подробнее',meetHoney:'Об этом мёде',unavailable:'Временно нет в наличии',
 available:'Доступен для заказа',askByPhone:'Уточните по телефону',
 slide:'слайд',carousel:'карусель',browse:'Листайте коллекцию',swipe:'листайте в сторону',
 previous:'предыдущий мёд',next:'следующий мёд',autoplayStart:'включить автопрокрутку',autoplayStop:'остановить автопрокрутку',
 about:'подробнее',package:'упаковка',currency:'сум',
 empty:'Мы обновляем коллекцию. Узнать о наличии мёда можно',call:'по телефону',
 language:'Язык сайта'
};
export const stringsFor=language=>language==='ru'?ru:uz;

// Translate known source text only, so edits made through the bot remain authoritative.
const productText=new Map([
 ['Chotqol','Чаткал'],['Qorong‘i to‘qay','Коронги Тукай'],['Cho‘l asali','Пустынный мёд'],
 ['Tog‘ asali','Горный мёд'],['Tyan-Shan · Tog‘ asali','Тянь-Шань · Горный мёд'],
 ['SHIFA ALEASAL asallar to‘plamidan','Из коллекции SHIFA ALEASAL'],
 ['Tyan-Shan · To‘qay asali','Тянь-Шань · Лесной мёд'],['Tyan-Shan · Katta qadoq','Тянь-Шань · Большая упаковка'],
 ['Tyan-Shan tog‘larining turli gullaridan yig‘ilgan asal. Xushbo‘y ifori va o‘ziga xos ta’mi bilan tanishing.','Мёд из цветов Тянь-Шаня. Познакомьтесь с его душистым ароматом и особенным вкусом.'],
 ['SHIFA ALEASAL to‘plamidagi Tyan-Shan tog‘ asali. Kundalik dasturxon uchun 450 grammlik ixcham shisha qadoq.','Горный мёд Тянь-Шаня из коллекции SHIFA ALEASAL. Удобная стеклянная банка 450 г для вашего стола.'],
 ['To‘plamimizdagi Cho‘l asali bilan tanishing. 450 grammlik shisha idishda, o‘zingiz yoki yaqinlaringiz dasturxoni uchun.','Познакомьтесь с пустынным мёдом из нашей коллекции. Стеклянная банка 450 г — для вас и ваших близких.'],
 ['Turli tog‘ va dala gullaridan yig‘ilgan Multiflora asali. To‘plamimizda 1 kilogrammlik katta shisha qadoqda taqdim etiladi.','Мёд Multi Flora из горных и полевых цветов. В нашей коллекции представлен в большой стеклянной банке 1 кг.'],
 ['Qorong‘i to‘qay asalining 1 450 grammlik katta qadog‘i. Oilaviy dasturxon uchun sevimli asalingizdan ko‘proq.','Мёд «Коронги Тукай» в большой банке 1 450 г. Больше любимого мёда для семейного стола.']
]);
export function localizeProduct(product,language='uz'){
 if(language!=='ru')return product;
 return {...product,...Object.fromEntries(['title','subtitle','description'].map(key=>[key,productText.get(product[key])??product[key]])),
  weight:String(product.weight??'').replace(/\bkg\b/g,'кг').replace(/\bg\b/g,'г')};
}
