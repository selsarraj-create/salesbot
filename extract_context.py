import os
import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as document:
            xml_content = document.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            text_parts = []
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            for node in tree.iter():
                if node.tag.endswith('}t'):
                    if node.text:
                        text_parts.append(node.text)
                elif node.tag.endswith('}p'):
                    text_parts.append('\n')
            
            return "".join(text_parts)
    except Exception as e:
        return f"Error reading {path}: {str(e)}"

context_dir = r"d:\SALESBOT\context"
# Filter specifically for FAQs
files = [f for f in os.listdir(context_dir) if 'FAQ' in f and f.endswith('.docx')]

print(f"Found {len(files)} FAQ files.\n")

for filename in files:
    print(f"--- START OF {filename} ---")
    content = get_docx_text(os.path.join(context_dir, filename))
    print(content) 
    print(f"--- END OF {filename} ---\n\n")
