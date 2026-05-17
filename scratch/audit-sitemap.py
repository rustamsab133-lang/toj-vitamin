import urllib.request
import xml.etree.ElementTree as ET

url = "https://www.toj-vitamin.tj/sitemap.xml"
try:
    with urllib.request.urlopen(url) as response:
        content = response.read()
        root = ET.fromstring(content)
        ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('ns:url', ns)
        print(f"Total URLs in Sitemap: {len(urls)}")
        
        products = [u.find('ns:loc', ns).text for u in urls if '/product/' in (u.find('ns:loc', ns).text if u.find('ns:loc', ns) is not None else '')]
        cities = [u.find('ns:loc', ns).text for u in urls if '/buy/' in (u.find('ns:loc', ns).text if u.find('ns:loc', ns) is not None else '')]
        articles = [u.find('ns:loc', ns).text for u in urls if '/journal/' in (u.find('ns:loc', ns).text if u.find('ns:loc', ns) is not None else '')]
        
        print(f"Product URLs: {len(products)}")
        print(f"City (pSEO) URLs: {len(cities)}")
        print(f"Article URLs: {len(articles)}")
        
except Exception as e:
    print(f"Error: {e}")
