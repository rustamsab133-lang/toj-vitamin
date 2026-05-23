import sys
import os
import json
import requests
from io import BytesIO
from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("Error: rembg not installed")
    sys.exit(1)

def main():
    # Настраиваем вывод терминала на UTF-8 для предотвращения ошибок на Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 3:
        print("Usage: python remove_bg_batch.py <input_json_path> <output_dir>")
        sys.exit(1)
        
    input_json_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.exists(input_json_path):
        print(f"Error: Input JSON file not found: {input_json_path}")
        sys.exit(1)
        
    with open(input_json_path, "r", encoding="utf-8") as f:
        products = json.load(f)
        
    os.makedirs(output_dir, exist_ok=True)
    
    total = len(products)
    print(f"🚀 Запуск пакетной обработки ИИ: {total} продуктов в очереди...")
    
    # Загружаем модель один раз при первом вызове remove
    # Сделаем тестовый прогон на пустом пикселе, чтобы проинициализировать модель в памяти
    print("⏳ Инициализация нейросети rembg...")
    try:
        empty_img = Image.new("RGBA", (1, 1), (255, 255, 255, 255))
        remove(empty_img)
        print("✅ Нейросеть успешно инициализирована!")
    except Exception as init_err:
        print(f"⚠️ Ошибка инициализации нейросети: {init_err}")
        # Продолжаем, возможно при реальном вызове сработает
        
    for i, p in enumerate(products):
        prod_id = p["id"]
        image_url = p["image_url"]
        
        print(f"⏳ [{(i+1)}/{total}] Обработка ID {prod_id}...")
        
        try:
            # Скачиваем изображение
            response = requests.get(image_url, timeout=15)
            if response.status_code != 200:
                print(f"   ❌ Ошибка скачивания (Статус: {response.status_code})")
                continue
                
            input_image = Image.open(BytesIO(response.content))
            
            # Удаляем фон
            output_image = remove(input_image)
            
            # Сохраняем результат
            output_path = os.path.join(output_dir, f"prod-{prod_id}.png")
            output_image.save(output_path, "PNG")
            
            print(f"   ✅ Успешно!")
        except Exception as e:
            print(f"   ❌ Ошибка: {e}")

    print("🏁 Все изображения успешно обработаны нейросетью!")

if __name__ == "__main__":
    main()
