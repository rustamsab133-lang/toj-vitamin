const dns = require('dns');
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Ошибка: В .env.local не найдены NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Пути к рабочим папкам
const scratchDir = path.join(__dirname, '../scratch');
const jsonPath = path.join(scratchDir, 'products_to_process.json');
const outputDir = path.join(scratchDir, 'processed_outputs');

// Создаем папки если их нет
fs.mkdirSync(scratchDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  console.log("🚀 Запуск супер-быстрой пакетной очистки фона всех продуктов...");

  // 1. Получаем все продукты из базы Supabase
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('id');

  if (error || !dbProducts) {
    console.error("❌ Ошибка загрузки продуктов из Supabase:", error?.message);
    process.exit(1);
  }

  console.log(`📦 Всего в базе найдено ${dbProducts.length} продуктов.`);

  // Фильтруем продукты, которые требуют очистки от фона
  const toProcess = dbProducts.filter(p => {
    if (!p.image_url) return false;
    // Пропускаем те, которые уже прозрачные PNG
    if (p.image_url.includes('/transparent/') || p.image_url.includes('/transparent-test/')) {
      return false;
    }
    return true;
  });

  console.log(`🎯 Требуют очистки: ${toProcess.length} продуктов.`);

  if (toProcess.length === 0) {
    console.log("✨ Все продукты уже имеют прозрачный фон в базе данных!");
    process.exit(0);
  }

  // Записываем список во временный JSON файл для Python
  fs.writeFileSync(jsonPath, JSON.stringify(toProcess, null, 2), 'utf-8');
  console.log(`📝 Записан список в ${jsonPath}`);

  // Очищаем папку processed_outputs от старых файлов перед запуском
  const oldFiles = fs.readdirSync(outputDir);
  for (const file of oldFiles) {
    fs.unlinkSync(path.join(outputDir, file));
  }

  // 2. Запускаем ОДИН персистентный питоновский процесс для пакетной обработки ИИ
  console.log("⚙️ Запуск нейросетевой обработки (Python)...");
  
  const pythonScript = path.join(__dirname, 'remove_bg_batch.py');
  
  const pythonProcess = spawn('python', [pythonScript, jsonPath, outputDir]);

  pythonProcess.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`⚠️ Python stderr: ${data.toString()}`);
  });

  pythonProcess.on('close', async (code) => {
    console.log(`\n🤖 Обработка нейросетью завершена (Код выхода: ${code})`);
    
    if (code !== 0) {
      console.error("❌ Питоновский скрипт завершился с ошибкой.");
      process.exit(1);
    }

    // 3. Загружаем все сгенерированные PNG в Supabase Storage и обновляем БД
    const generatedFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
    console.log(`\n📤 Начинаем загрузку ${generatedFiles.length} прозрачных файлов в Supabase...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < generatedFiles.length; i++) {
      const filename = generatedFiles[i]; // Формат prod-XX.png
      const idStr = filename.replace('prod-', '').replace('.png', '');
      const id = parseInt(idStr, 10);
      
      const filePath = path.join(outputDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      
      const bucketName = 'product-images';
      const storagePath = `transparent/prod-${id}.png`;

      console.log(`⏳ [${i + 1}/${generatedFiles.length}] Загрузка ID ${id}: ${filename} -> Storage...`);

      try {
        // Загружаем в бакет
        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        // Получаем публичную ссылку
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        // Обновляем ссылку в базе данных
        const { error: updateErr } = await supabase
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', id);

        if (updateErr) throw updateErr;

        console.log(`   ✅ Успешно! Ссылка: ${publicUrl}`);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Ошибка для ID ${id}:`, err.message);
        errorCount++;
      }
    }

    // 4. Очищаем временные файлы
    try {
      fs.unlinkSync(jsonPath);
      for (const file of generatedFiles) {
        fs.unlinkSync(path.join(outputDir, file));
      }
      fs.rmdirSync(outputDir);
    } catch (rmErr) {
      // Игнорируем ошибки удаления временных файлов
    }

    console.log(`\n🏁 ВСЯ ПАКЕТНАЯ ОБРАБОТКА ЗАВЕРШЕНА!`);
    console.log(`🎉 Успешно вырезан фон и обновлен в БД: ${successCount} продуктов.`);
    if (errorCount > 0) {
      console.warn(`⚠️ Произошли ошибки при загрузке: ${errorCount} продуктов.`);
    }
  });
}

main().catch(err => {
  console.error("❌ Критическая ошибка в главном цикле:", err);
});
