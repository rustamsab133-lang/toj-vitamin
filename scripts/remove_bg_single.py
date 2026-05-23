import sys
import os
from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("Error: rembg not installed")
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove_bg_single.py <input_path> <output_path>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
        
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, "PNG")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
